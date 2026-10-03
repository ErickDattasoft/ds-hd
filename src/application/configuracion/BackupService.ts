import type { BitacoraService } from '../shared/BitacoraService.js';
import type { IEmpresaRepository } from '../../core/ports/repositories/IEmpresaRepository.js';
import type { IContactoRepository } from '../../core/ports/repositories/IContactoRepository.js';
import type { ITicketRepository } from '../../core/ports/repositories/ITicketRepository.js';
import type { ITicketQueries } from '../../core/ports/repositories/ITicketQueries.js';
import type { ICotizacionRepository } from '../../core/ports/repositories/ICotizacionRepository.js';
import type { IVersionRepository } from '../../core/ports/repositories/IVersionRepository.js';
import type { IKnowledgeRepository } from '../../core/ports/repositories/IKnowledgeRepository.js';
import type { IUsuarioRepository } from '../../core/ports/repositories/IUsuarioRepository.js';
import type { IConfiguracionRepository } from '../../core/ports/repositories/IConfiguracionRepository.js';
import type { IContadorRepository } from '../../core/ports/repositories/IContadorRepository.js';
import type { IOportunidadRepository } from '../../core/ports/repositories/IOportunidadRepository.js';
import { Oportunidad, type OportunidadProps } from '../../core/entities/Oportunidad.js';
import type { IClock } from '../../core/ports/services/IClock.js';
import type { IWebhookPublisher } from '../../core/ports/services/IWebhookPublisher.js';
import { backupAtrasado, diasSinBackup, type EstadoBackup } from '../../core/entities/EstadoBackup.js';
import { Empresa, type EmpresaProps } from '../../core/entities/Empresa.js';
import { Contacto, type ContactoProps } from '../../core/entities/Contacto.js';
import { Ticket, type TicketProps } from '../../core/entities/Ticket.js';
import { Cotizacion, type CotizacionProps } from '../../core/entities/Cotizacion.js';
import { VersionSistema, type VersionSistemaProps } from '../../core/entities/VersionSistema.js';
import { ArticuloKB, type ArticuloKBProps } from '../../core/entities/ArticuloKB.js';
import { Usuario, type UsuarioProps } from '../../core/entities/Usuario.js';
import { sanearAcercaDe } from '../../core/entities/AcercaDe.js';
import { sanearConfigCotizaciones } from '../../core/entities/ConfiguracionCotizaciones.js';
import { sanearConfigResumen } from '../../core/entities/ConfiguracionResumen.js';
import { CONTADOR_TICKETS } from '../tickets/constantes.js';
import type { EventoTicket, NotaTicket } from '../../core/entities/NotaTicket.js';
import { ForbiddenError, ValidationError } from '../../core/errors/DomainError.js';
import type { SessionUser } from '../shared/SessionUser.js';

/** Versión del formato de backup — súbela si cambia la forma de alguna sección. */
export const VERSION_BACKUP = 1;

/** Cuántos registros de cada colección se restauraron, y qué falló. */
export interface ResumenRestauracion {
  empresas: number;
  contactos: number;
  tickets: number;
  cotizaciones: number;
  versiones: number;
  kb: number;
  usuarios: number;
  errores: string[];
}

const arr = (v: unknown): Record<string, unknown>[] => (Array.isArray(v) ? (v as Record<string, unknown>[]) : []);

/** Secciones que `restaurar()` lee; un archivo sin ninguna como arreglo no es un backup de ds-hd. */
const SECCIONES_BACKUP = ['empresas', 'contactos', 'tickets', 'cotizaciones', 'oportunidades', 'versiones', 'kb', 'usuarios'];

/**
 * Rechaza un archivo que no tenga la forma de `exportar()`. Sin esto, un respaldo del CRM viejo
 * (`{ version, app, fecha, datos: {...} }`) "se restauraba" con 0 en todo y sin ningún aviso.
 */
function validarFormaBackup(datos: Record<string, unknown>): void {
  if (SECCIONES_BACKUP.some((k) => Array.isArray(datos[k]))) return;
  const esCrmViejo = typeof datos.datos === 'object' && datos.datos !== null && !Array.isArray(datos.datos);
  throw new ValidationError(
    esCrmViejo
      ? 'Este archivo es un respaldo del CRM viejo, no un backup de ds-hd. Súbelo en «📥 Importar respaldo del CRM viejo», más abajo en esta misma página.'
      : 'Este archivo no es un backup de ds-hd: no trae empresas, contactos, tickets ni ninguna otra sección. Usa un archivo generado con «Descargar backup».',
  );
}

const RE_FECHA_ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

/** Recorre el JSON del backup y convierte cada string con pinta de fecha ISO (como las que
 * produce `Date.toJSON()` al exportar) de vuelta a `Date` — así no hay que listar a mano
 * cada campo de fecha de cada entidad, ni sus estructuras anidadas (sla, facturación...). */
function reviveFechas(v: unknown): unknown {
  if (typeof v === 'string') return RE_FECHA_ISO.test(v) ? new Date(v) : v;
  if (Array.isArray(v)) return v.map(reviveFechas);
  if (v && typeof v === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v)) out[k] = reviveFechas(val);
    return out;
  }
  return v;
}

/**
 * Backup/restauración completa de ds-hd, en el propio formato del sistema (no el del CRM
 * viejo — ese lo maneja `scripts/migrate/`). Pensado para respaldo manual y recuperación
 * ante desastres, no para migrar entre sistemas distintos.
 *
 * Restaurar es SIEMPRE upsert (agrega/actualiza por id) — nunca borra lo que ya existe en
 * ds-hd y no viene en el archivo. Un modo de reemplazo total (borrar lo que sobra) quedó
 * descartado a propósito: es mucho más arriesgado y el usuario pidió explícitamente la
 * opción segura.
 */
export class BackupService {
  constructor(
    private readonly empresas: IEmpresaRepository,
    private readonly contactos: IContactoRepository,
    private readonly ticketRepo: ITicketRepository,
    private readonly ticketQueries: ITicketQueries,
    private readonly cotizaciones: ICotizacionRepository,
    private readonly versiones: IVersionRepository,
    private readonly kb: IKnowledgeRepository,
    private readonly usuarios: IUsuarioRepository,
    private readonly configuracion: IConfiguracionRepository,
    private readonly contador: IContadorRepository,
    private readonly clock: IClock,
    private readonly oportunidades?: IOportunidadRepository,
    private readonly webhooks?: IWebhookPublisher,
    private readonly bitacora?: BitacoraService,
  ) {}

  /** Anota quién y cuándo descargó el backup (para la alerta de 7 días, como el viejo). */
  async registrarDescarga(actor: SessionUser): Promise<void> {
    const actual = await this.configuracion.obtenerEstadoBackup();
    await this.configuracion.guardarEstadoBackup({
      ...actual,
      ultimoBackup: this.clock.now().toISOString(),
      ultimoBackupPor: actor.nombre,
    });
    await this.bitacora?.registrar({
      actor, accion: 'descargar', modulo: 'backup', entidadTipo: 'Backup', entidadId: '-',
      resumen: 'Backup completo descargado',
    });
  }

  /** Último backup y si ya toca alertar. */
  async estado(): Promise<EstadoBackup & { dias: number | null; atrasado: boolean }> {
    const e = await this.configuracion.obtenerEstadoBackup();
    const ahora = this.clock.now();
    return { ...e, dias: diasSinBackup(e, ahora), atrasado: backupAtrasado(e, ahora) };
  }

  /**
   * Evento `backup.no_realizado` (n8n/WhatsApp) cuando pasan 7 días o más sin backup — a lo
   * más una vez al día. Lo llama el cron.
   */
  async avisarSiAtrasado(): Promise<{ avisado: boolean; dias: number | null }> {
    const e = await this.estado();
    const hoy = this.clock.now().toISOString().slice(0, 10);
    if (!e.atrasado || e.ultimoAvisoNoRealizado === hoy || !this.webhooks) return { avisado: false, dias: e.dias };
    await this.webhooks.publicar({
      evento: 'backup.no_realizado',
      canal: 'tickets',
      payload: { diasSinBackup: e.dias, ultimoBackup: e.ultimoBackup, ultimoBackupPor: e.ultimoBackupPor },
    });
    await this.configuracion.guardarEstadoBackup({
      ultimoBackup: e.ultimoBackup,
      ultimoBackupPor: e.ultimoBackupPor,
      ultimoAvisoNoRealizado: hoy,
    });
    return { avisado: true, dias: e.dias };
  }

  /** Vuelca todas las colecciones principales a un solo objeto serializable a JSON. */
  async exportar(): Promise<Record<string, unknown>> {
    const [
      empresas,
      contactos,
      tickets,
      cotizaciones,
      versiones,
      kb,
      usuarios,
      tickets_cfg,
      calculadora,
      avisos,
      acercaDe,
      cotizaciones_cfg,
      logo,
      resumen,
      oportunidades,
      detalle,
    ] = await Promise.all([
      this.empresas.list({}),
      this.contactos.list({}),
      this.ticketQueries.listar({}),
      this.cotizaciones.list({}),
      this.versiones.list(),
      this.kb.list({}),
      this.usuarios.list({}),
      this.configuracion.obtenerTickets(),
      this.configuracion.obtenerCalculadora(),
      this.configuracion.obtenerAvisos(),
      this.configuracion.obtenerAcercaDe(),
      this.configuracion.obtenerCotizaciones(),
      this.configuracion.obtenerLogo(),
      this.configuracion.obtenerResumen(),
      this.oportunidades?.list() ?? Promise.resolve([]),
      this.ticketRepo.listarDetalleTodos(),
    ]);

    return {
      version: VERSION_BACKUP,
      generadoEn: this.clock.now().toISOString(),
      empresas,
      contactos,
      tickets,
      // Conversación (respuestas por correo y del CRM) y actividad de cada ticket, por id.
      ticketsDetalle: Object.fromEntries(detalle),
      cotizaciones,
      versiones,
      kb,
      oportunidades,
      // Las cuentas se listan sin nada sensible de Auth (no hay contraseñas que respaldar
      // aquí — eso vive en Firebase Auth, fuera de Firestore).
      // Sin el secreto de la verificación en dos pasos: quien tenga el archivo no debe poder generar códigos.
      usuarios: usuarios.map((u) => ({ ...u, email: u.email.value, totpSecreto: null, totpActivo: false })),
      configuracion: {
        tickets: tickets_cfg,
        calculadora,
        avisos,
        acercaDe,
        cotizaciones: cotizaciones_cfg,
        logo,
        resumen,
      },
    };
  }

  /** Restaura un backup exportado por `exportar()` — upsert por id, nunca borra. */
  async restaurar(actor: SessionUser, datosCrudos: Record<string, unknown>): Promise<ResumenRestauracion> {
    if (!actor.permisos.includes('configuracion:integraciones')) {
      throw new ForbiddenError('No puedes restaurar backups');
    }
    validarFormaBackup(datosCrudos);
    const datos = reviveFechas(datosCrudos) as Record<string, unknown>;

    const resumen: ResumenRestauracion = {
      empresas: 0,
      contactos: 0,
      tickets: 0,
      cotizaciones: 0,
      versiones: 0,
      kb: 0,
      usuarios: 0,
      errores: [],
    };

    for (const d of arr(datos.empresas)) {
      try {
        await this.empresas.save(new Empresa(d as unknown as EmpresaProps));
        resumen.empresas++;
      } catch (err) {
        resumen.errores.push(`empresa "${d.nombre}": ${err instanceof Error ? err.message : err}`);
      }
    }
    for (const d of arr(datos.contactos)) {
      try {
        await this.contactos.save(new Contacto(d as unknown as ContactoProps));
        resumen.contactos++;
      } catch (err) {
        resumen.errores.push(`contacto "${d.nombre}": ${err instanceof Error ? err.message : err}`);
      }
    }
    let maxNumero = 0;
    const detalle = (datos.ticketsDetalle ?? {}) as Record<string, { notas?: NotaTicket[]; eventos?: EventoTicket[] }>;
    const conDetalle: { ticket: Ticket; notas: NotaTicket[]; eventos: EventoTicket[] }[] = [];
    for (const d of arr(datos.tickets)) {
      try {
        const ticket = new Ticket(d as unknown as TicketProps);
        await this.ticketRepo.save(ticket);
        maxNumero = Math.max(maxNumero, ticket.numero);
        resumen.tickets++;
        const det = detalle[ticket.id];
        if (det && (det.notas?.length || det.eventos?.length)) {
          conDetalle.push({ ticket, notas: det.notas ?? [], eventos: det.eventos ?? [] });
        }
      } catch (err) {
        resumen.errores.push(`ticket #${d.numero}: ${err instanceof Error ? err.message : err}`);
      }
    }
    // Notas y eventos conservan su id: restaurar dos veces no duplica la conversación.
    if (conDetalle.length) {
      try {
        await this.ticketRepo.guardarVariosConDetalle(conDetalle);
      } catch (err) {
        resumen.errores.push(`conversaciones de tickets: ${err instanceof Error ? err.message : err}`);
      }
    }
    if (maxNumero > 0) await this.contador.fijar(CONTADOR_TICKETS, maxNumero);
    for (const d of arr(datos.cotizaciones)) {
      try {
        await this.cotizaciones.save(new Cotizacion(d as unknown as CotizacionProps));
        resumen.cotizaciones++;
      } catch (err) {
        resumen.errores.push(`cotización "${d.folio}": ${err instanceof Error ? err.message : err}`);
      }
    }
    for (const d of arr(datos.oportunidades)) {
      try {
        await this.oportunidades?.save(new Oportunidad(d as unknown as OportunidadProps));
      } catch (err) {
        resumen.errores.push(`oportunidad "${d.titulo}": ${err instanceof Error ? err.message : err}`);
      }
    }
    for (const d of arr(datos.versiones)) {
      try {
        await this.versiones.save(new VersionSistema(d as unknown as VersionSistemaProps));
        resumen.versiones++;
      } catch (err) {
        resumen.errores.push(`versión "${d.sistema}": ${err instanceof Error ? err.message : err}`);
      }
    }
    for (const d of arr(datos.kb)) {
      try {
        await this.kb.save(new ArticuloKB(d as unknown as ArticuloKBProps));
        resumen.kb++;
      } catch (err) {
        resumen.errores.push(`artículo "${d.titulo}": ${err instanceof Error ? err.message : err}`);
      }
    }
    for (const d of arr(datos.usuarios)) {
      try {
        // El backup no trae el secreto 2FA: conserva el que ya tenga la cuenta.
        const existente = await this.usuarios.findByUid(String(d.uid));
        await this.usuarios.save(
          new Usuario({
            ...(d as unknown as UsuarioProps),
            totpSecreto: existente?.totpSecreto ?? null,
            totpActivo: existente?.totpActivo ?? false,
          }),
        );
        resumen.usuarios++;
      } catch (err) {
        resumen.errores.push(`usuario "${d.email}": ${err instanceof Error ? err.message : err}`);
      }
    }
    const cfg = (datos.configuracion ?? {}) as Record<string, unknown>;
    if (cfg.tickets) await this.configuracion.guardarTickets(cfg.tickets as never);
    if (cfg.calculadora) await this.configuracion.guardarCalculadora(cfg.calculadora as never);
    if (cfg.avisos) await this.configuracion.guardarAvisos(cfg.avisos as never);
    if (cfg.acercaDe) await this.configuracion.guardarAcercaDe(sanearAcercaDe(cfg.acercaDe));
    if (cfg.cotizaciones) {
      await this.configuracion.guardarCotizaciones(sanearConfigCotizaciones(cfg.cotizaciones));
    }
    if (cfg.logo) await this.configuracion.guardarLogo(cfg.logo as never);
    if (cfg.resumen) await this.configuracion.guardarResumen(sanearConfigResumen(cfg.resumen));

    await this.bitacora?.registrar({
      actor, accion: 'restaurar', modulo: 'backup', entidadTipo: 'Backup', entidadId: '-',
      resumen: `Backup restaurado: ${Object.entries(resumen).filter(([, n]) => typeof n === 'number' && n > 0).map(([k, n]) => `${n} ${k}`).join(', ') || 'sin cambios'}`,
    });
    return resumen;
  }
}
