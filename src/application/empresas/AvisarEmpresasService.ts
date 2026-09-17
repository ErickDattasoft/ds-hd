import type { IEmpresaRepository } from '../../core/ports/repositories/IEmpresaRepository.js';
import type { IContactoRepository } from '../../core/ports/repositories/IContactoRepository.js';
import type { IVersionRepository } from '../../core/ports/repositories/IVersionRepository.js';
import type { IConfiguracionRepository } from '../../core/ports/repositories/IConfiguracionRepository.js';
import type { IEmailSender } from '../../core/ports/services/IEmailSender.js';
import type { IIntegracionesGateway } from '../../core/ports/services/IIntegracionesGateway.js';
import type { IClock } from '../../core/ports/services/IClock.js';
import { normalizarTelefonoMx } from '../../core/entities/value-objects/Telefono.js';
import { ForbiddenError } from '../../core/errors/DomainError.js';
import { formatearContactoSoporte, formatearLicenciasPendientes, formatearSistemasPendientes, renderizarPlantilla } from './avisos.js';
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
  ) {}

  async ejecutar(input: {
    actor: SessionUser;
    empresaIds: string[];
    tipo: TipoAviso;
    canal?: CanalAviso;
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
    for (const v of listaVersiones) oficial[v.sistema] = v.versionActual;
    const hoy = this.clock.now();

    const resultados: ResultadoAviso[] = [];
    for (const empresaId of input.empresaIds) {
      const empresa = await this.empresas.findById(empresaId);
      if (!empresa) {
        resultados.push({ empresaId, empresaNombre: empresaId, enviado: false, motivo: 'no_encontrada' });
        continue;
      }

      const pendientesTexto =
        input.tipo === 'versiones' ? formatearSistemasPendientes(empresa, oficial) : formatearLicenciasPendientes(empresa, hoy);
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

      const contactosSoporte =
        input.tipo === 'versiones' ? config.contactosSoporteVersiones : config.contactosSoporteLicencias;
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
