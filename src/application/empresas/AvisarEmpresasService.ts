import type { IUsuarioRepository } from '../../core/ports/repositories/IUsuarioRepository.js';
import type { IEmpresaRepository } from '../../core/ports/repositories/IEmpresaRepository.js';
import type { IContactoRepository } from '../../core/ports/repositories/IContactoRepository.js';
import type { IVersionRepository } from '../../core/ports/repositories/IVersionRepository.js';
import type { IAvisoRepository } from '../../core/ports/repositories/IAvisoRepository.js';
import type { IIdGenerator } from '../../core/ports/services/IIdGenerator.js';
import type { AvisoEnviado } from '../../core/entities/AvisoEnviado.js';
import type { Empresa } from '../../core/entities/Empresa.js';
import type { IConfiguracionRepository } from '../../core/ports/repositories/IConfiguracionRepository.js';
import type { IEmailSender } from '../../core/ports/services/IEmailSender.js';
import type { IIntegracionesGateway } from '../../core/ports/services/IIntegracionesGateway.js';
import type { IClock } from '../../core/ports/services/IClock.js';
import { normalizarTelefonoMx } from '../../core/entities/value-objects/Telefono.js';
import { ForbiddenError } from '../../core/errors/DomainError.js';
import {
  claveAviso,
  clavePendiente,
  formatearContactoSoporte,
  formatearLicenciasPendientes,
  formatearSistemasPendientes,
  filtrarPendientes,
  licenciasPendientes,
  renderizarPlantilla,
  sistemasPendientes,
  type PendienteAviso,
} from './avisos.js';
import type { SessionUser } from '../shared/SessionUser.js';
import type { BitacoraService } from '../shared/BitacoraService.js';

export type TipoAviso = 'versiones' | 'licencias';
export type CanalAviso = 'correo' | 'whatsapp';

/** Qué pasó al intentar avisar a una empresa (enviado, o por qué no). */
export interface ResultadoAviso {
  empresaId: string;
  empresaNombre: string;
  enviado: boolean;
  motivo?: 'sin_pendientes' | 'sin_contacto_correo' | 'sin_contacto_telefono' | 'no_encontrada';
  /** Solo cuando enviado=true por WhatsApp sin webhook n8n: el cliente debe abrir
   * wa.me con este teléfono/mensaje (mismo respaldo "WhatsApp Web" del CRM viejo). */
  whatsappManual?: { telefono: string; mensaje: string };
  /** Respuesta del proveedor de WhatsApp (Meta/Twilio), si se usó. */
  detalle?: string;
}

/** Caso de uso: avisar (por correo o WhatsApp) a un lote de empresas sobre versiones
 * desactualizadas o licencias por vencer/vencidas, con la plantilla y contactos de soporte
 * configurados. WhatsApp no usa CallMeBot (solo manda al número propio dado de alta) — manda
 * el evento `empresa.avisar_whatsapp` al webhook n8n dedicado, para que se enrute ahí a un
 * proveedor real de WhatsApp Business. Si no hay webhook configurado, cae al mismo respaldo
 * que el CRM viejo: el cliente abre wa.me/WhatsApp Web con el mensaje ya redactado. */
export class AvisarEmpresasService {
  constructor(
    private readonly empresas: IEmpresaRepository,
    private readonly contactos: IContactoRepository,
    private readonly versiones: IVersionRepository,
    private readonly configuracion: IConfiguracionRepository,
    private readonly email: IEmailSender,
    private readonly gateway: IIntegracionesGateway,
    private readonly bitacora: BitacoraService,
    private readonly clock: IClock,
    private readonly avisos: IAvisoRepository,
    private readonly ids: IIdGenerator,
    private readonly usuarios?: IUsuarioRepository,
  ) {}

  /** Los pendientes de cada empresa, para la pantalla donde se eligen antes de enviar. */
  async pendientes(
    actor: SessionUser,
    empresaIds: string[],
    tipo: TipoAviso,
  ): Promise<{ empresaId: string; empresaNombre: string; pendientes: PendienteAviso[] }[]> {
    if (!actor.permisos.includes('empresas:editar')) {
      throw new ForbiddenError('No puedes enviar avisos a empresas');
    }
    const hoy = this.clock.now();
    const oficial: Record<string, string> = {};
    const cartas: Record<string, string | null> = {};
    for (const v of await this.versiones.list()) {
      oficial[v.sistema] = v.versionActual;
      cartas[v.sistema] = v.linkCartaTecnica;
    }
    const avisados = await this.indiceAvisados();
    const out = [];
    for (const empresaId of empresaIds) {
      const empresa = await this.empresas.findById(empresaId);
      if (!empresa) continue;
      const pendientes =
        tipo === 'versiones' ? sistemasPendientes(empresa, oficial, cartas) : licenciasPendientes(empresa, hoy);
      out.push({
        empresaId,
        empresaNombre: empresa.nombre,
        // Como en el CRM viejo: lo ya avisado se muestra con su fecha y sale desmarcado.
        pendientes: pendientes.map((p) => ({ ...p, avisadoEl: avisados.get(clavePendiente(empresaId, tipo, p)) ?? null })),
      });
    }
    return out;
  }

  /**
   * Cuántos pendientes de cada empresa **aún no se han avisado**, por tipo — lo que contaban
   * los botones "🔔 Sistemas desactualizados" y "⏰ Licencias por vencer" del CRM viejo.
   */
  async sinAvisar(
    empresas: Empresa[],
    oficialPorSistema: Record<string, string>,
    hoy: Date,
  ): Promise<Map<string, { versiones: number; licencias: number }>> {
    const avisados = await this.indiceAvisados();
    const out = new Map<string, { versiones: number; licencias: number }>();
    for (const e of empresas) {
      out.set(e.id, {
        versiones: sistemasPendientes(e, oficialPorSistema).filter(
          (p) => !avisados.has(clavePendiente(e.id, 'versiones', p)),
        ).length,
        licencias: licenciasPendientes(e, hoy).filter((p) => !avisados.has(clavePendiente(e.id, 'licencias', p)))
          .length,
      });
    }
    return out;
  }

  /** Clave de cada aviso ya enviado → fecha del más reciente. */
  private async indiceAvisados(): Promise<Map<string, Date>> {
    const out = new Map<string, Date>();
    for (const a of await this.avisos.listTodos()) {
      const clave = claveAviso(
        a.empresaId,
        a.tipo,
        a.sistema,
        a.tipo === 'sistema' ? a.versionOficial : a.fechaVencimiento,
      );
      const previa = out.get(clave);
      if (!previa || previa < a.createdAt) out.set(clave, a.createdAt);
    }
    return out;
  }

  async ejecutar(input: {
    actor: SessionUser;
    empresaIds: string[];
    tipo: TipoAviso;
    canal?: CanalAviso;
    /** Qué sistemas mencionar por empresa (`empresaId` → sistemas). Sin esto van todos los pendientes. */
    seleccion?: Record<string, string[]>;
  }): Promise<ResultadoAviso[]> {
    if (!input.actor.permisos.includes('empresas:editar')) {
      throw new ForbiddenError('No puedes enviar avisos a empresas');
    }
    const canal = input.canal ?? 'correo';

    const [config, integraciones, listaVersiones] = await Promise.all([
      this.configuracion.obtenerAvisos(),
      this.configuracion.obtenerIntegraciones(),
      this.versiones.list(),
    ]);
    const oficial: Record<string, string> = {};
    const cartas: Record<string, string | null> = {};
    for (const v of listaVersiones) {
      oficial[v.sistema] = v.versionActual;
      cartas[v.sistema] = v.linkCartaTecnica;
    }
    const hoy = this.clock.now();

    const resultados: ResultadoAviso[] = [];
    for (const empresaId of input.empresaIds) {
      const empresa = await this.empresas.findById(empresaId);
      if (!empresa) {
        resultados.push({ empresaId, empresaNombre: empresaId, enviado: false, motivo: 'no_encontrada' });
        continue;
      }

      const elegidos = input.seleccion?.[empresaId];
      if (elegidos && elegidos.length === 0) {
        resultados.push({ empresaId, empresaNombre: empresa.nombre, enviado: false, motivo: 'sin_pendientes' });
        continue;
      }
      const pendientesTexto =
        input.tipo === 'versiones'
          ? formatearSistemasPendientes(empresa, oficial, elegidos, cartas)
          : formatearLicenciasPendientes(empresa, hoy, elegidos);
      const sinPendientes = pendientesTexto.startsWith('(sin ');
      if (sinPendientes) {
        resultados.push({ empresaId, empresaNombre: empresa.nombre, enviado: false, motivo: 'sin_pendientes' });
        continue;
      }

      const contactosEmpresa = await this.contactos.list({ empresaId, activo: true });
      const contacto =
        canal === 'whatsapp'
          ? (contactosEmpresa.find((c) => c.id === empresa.contactoPrincipalId && (c.celular || c.telefono)) ??
            contactosEmpresa.find((c) => c.celular || c.telefono))
          : (contactosEmpresa.find((c) => c.id === empresa.contactoPrincipalId && c.email) ??
            contactosEmpresa.find((c) => c.email));
      const telefono = contacto?.celular || contacto?.telefono || '';
      if (canal === 'whatsapp' ? !telefono : !contacto?.email) {
        resultados.push({
          empresaId,
          empresaNombre: empresa.nombre,
          enviado: false,
          motivo: canal === 'whatsapp' ? 'sin_contacto_telefono' : 'sin_contacto_correo',
        });
        continue;
      }

      // Los contactos propios de quien envía (Mi perfil) ganan sobre la lista general.
      const propios = (await this.usuarios?.findByUid(input.actor.uid))?.contactosSoporte ?? [];
      const contactosSoporte = propios.length
        ? propios
        : input.tipo === 'versiones'
          ? config.contactosSoporteVersiones
          : config.contactosSoporteLicencias;
      const plantilla = input.tipo === 'versiones' ? config.plantillaVersiones : config.plantillaLicencias;
      const mensaje = renderizarPlantilla(plantilla, {
        contacto: contacto!.nombre,
        empresa: empresa.nombre,
        sistemas_pendientes: pendientesTexto,
        licencias_pendientes: pendientesTexto,
        contacto_soporte: formatearContactoSoporte(contactosSoporte),
      });

      let whatsappManual: { telefono: string; mensaje: string } | undefined;
      let detalleEnvio: string | undefined;
      if (canal === 'whatsapp') {
        const wa = integraciones.whatsappClientes;
        const automatico = wa && (wa.proveedor === 'meta' || wa.proveedor === 'twilio') && this.gateway.enviarWhatsAppClientes;
        if (automatico) {
          const r = await this.gateway.enviarWhatsAppClientes!(wa, telefono, mensaje);
          detalleEnvio = r.detalle;
          // Si la API falla, no se pierde el aviso: queda el botón para mandarlo a mano.
          if (!r.ok) whatsappManual = { telefono: normalizarTelefonoMx(telefono), mensaje };
        } else if (wa?.proveedor !== 'manual' && integraciones.n8nWebhookEmpresas) {
          await this.gateway.postWebhook(integraciones.n8nWebhookEmpresas, {
            evento: 'empresa.avisar_whatsapp',
            empresaId: empresa.id,
            empresaNombre: empresa.nombre,
            telefono,
            mensaje,
            _ts: Date.now(),
          });
        } else {
          // Sin n8n configurado: mismo respaldo que el CRM viejo — el navegador abre
          // WhatsApp Web/wa.me por el usuario en vez de mandarlo por webhook.
          whatsappManual = { telefono: normalizarTelefonoMx(telefono), mensaje };
        }
      } else {
        await this.email.enviar({
          para: [{ email: contacto!.email!, nombre: contacto!.nombre }],
          asunto: input.tipo === 'versiones' ? 'Actualización disponible para tus sistemas' : 'Vigencia de tu licencia',
          html: mensaje.replaceAll('\n', '<br>'),
          texto: mensaje,
          tags: [`aviso-${input.tipo}`],
        });
      }

      if (input.tipo === 'versiones') empresa.marcarAvisoVersiones(hoy);
      else empresa.marcarAvisoLicencias(hoy);
      await this.empresas.save(empresa);

      // Historial: una fila por sistema avisado, no por envío — así queda registrado de qué
      // versión a cuál se avisó, que es lo que la fecha de "último aviso" no puede decir.
      const avisados = filtrarPendientes(
        input.tipo === 'versiones'
          ? sistemasPendientes(empresa, oficial, cartas)
          : licenciasPendientes(empresa, hoy),
        elegidos,
      );
      await this.avisos.registrar(
        avisados.map(
          (p): AvisoEnviado => ({
            id: this.ids.newId(),
            empresaId: empresa.id,
            empresaNombre: empresa.nombre,
            sistema: p.sistema,
            tipo: input.tipo === 'versiones' ? 'sistema' : 'licencia',
            versionInstalada: p.versionInstalada ?? null,
            versionOficial: p.versionOficial ?? null,
            fechaVencimiento: p.fechaVencimiento ?? null,
            canal,
            destino: (canal === 'whatsapp' ? telefono : contacto!.email) || null,
            enviadoPorUid: input.actor.uid,
            enviadoPorNombre: input.actor.nombre,
            createdAt: this.clock.now(),
          }),
        ),
      );
      await this.bitacora.registrar({
        actor: input.actor,
        accion: 'aviso',
        modulo: 'empresas',
        entidadTipo: 'Empresa',
        entidadId: empresa.id,
        resumen:
          canal === 'whatsapp'
            ? `Aviso de ${input.tipo} por WhatsApp a ${contacto!.nombre} (${telefono})${detalleEnvio ? ` — ${detalleEnvio}` : ''}`
            : `Aviso de ${input.tipo} enviado a ${contacto!.nombre} (${contacto!.email})`,
      });
      resultados.push({
        empresaId,
        empresaNombre: empresa.nombre,
        enviado: true,
        whatsappManual,
        ...(detalleEnvio ? { detalle: detalleEnvio } : {}),
      });
    }
    return resultados;
  }
}
