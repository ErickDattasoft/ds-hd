import type { INotaPersonalRepository } from '../../core/ports/repositories/INotaPersonalRepository.js';
import { notaDesdeDatos, type NotaPersonal } from '../../core/entities/NotaPersonal.js';
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
import type {
  IEventoRepository,
  IInscripcionRepository,
  IListaNegraRepository,
} from '../../core/ports/repositories/IEventoRepository.js';
import type { IBitacoraRepository } from '../../core/ports/repositories/IBitacoraRepository.js';
import type { EntradaBitacora } from '../../core/entities/EntradaBitacora.js';
import type { IAvisoRepository } from '../../core/ports/repositories/IAvisoRepository.js';
import type { IInteraccionRepository, ITareaRepository } from '../../core/ports/repositories/ISeguimientoRepository.js';
import type { IPizarraKBRepository } from '../../core/ports/repositories/IPizarraKBRepository.js';
import type { IFiltroGuardadoRepository } from '../../core/ports/repositories/IFiltroGuardadoRepository.js';
import { Evento, type EventoProps } from '../../core/entities/Evento.js';
import { Tarea, type TareaProps } from '../../core/entities/Tarea.js';
import { Interaccion, type InteraccionProps } from '../../core/entities/Interaccion.js';
import type { AvisoEnviado } from '../../core/entities/AvisoEnviado.js';
import type { PizarraKB } from '../../core/entities/PizarraKB.js';
import type { FiltroGuardado } from '../../core/entities/FiltroGuardado.js';
import type { ConfiguracionIntegraciones } from '../../core/entities/ConfiguracionIntegraciones.js';
import type { ConfiguracionCorreoEntrante } from '../../core/entities/ConfiguracionCorreoEntrante.js';
import type { EntradaListaNegra, Inscripcion } from '../../core/entities/Inscripcion.js';
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
  eventos: number;
  /** Registros del link abierto (inscripciones) de todos los eventos. */
  inscritos: number;
  /** Historial de avisos de versiones/licencias enviados. */
  avisos: number;
  tareas: number;
  /** Seguimiento de empresas (llamadas, reuniones, notas…). */
  interacciones: number;
  /** Entradas de la bitácora (quién hizo qué y cuándo). */
  bitacora: number;
  errores: string[];
}

/**
 * Repositorios que el backup respalda además de los básicos (opcionales para no romper pruebas
 * viejas): Eventos, historial de avisos, seguimiento, pizarras de KB y filtros guardados.
 */
export interface ReposExtraBackup {
  eventos: IEventoRepository;
  inscripciones: IInscripcionRepository;
  listaNegra: IListaNegraRepository;
  avisos: IAvisoRepository;
  tareas: ITareaRepository;
  interacciones: IInteraccionRepository;
  pizarras: IPizarraKBRepository;
  filtros: IFiltroGuardadoRepository;
  bitacora: IBitacoraRepository;
  /** 🗒️ Notas personales (opcional: los tests viejos no lo pasan). */
  notas?: INotaPersonalRepository;
}

/** Tope de entradas de bitácora a respaldar (de las más recientes hacia atrás). */
const MAX_BITACORA = 1_000_000;

/** Tope de interacciones a respaldar (el repo solo lista «las más recientes»). */
const MAX_INTERACCIONES = 100_000;

/** Integraciones SIN claves: el archivo de respaldo no debe llevar llaves de API. */
function integracionesSinClaves(c: ConfiguracionIntegraciones): ConfiguracionIntegraciones {
  return {
    ...c,
    whatsappApiKey: '',
    whatsappOtros: (c.whatsappOtros ?? []).map((o) => ({ ...o, apiKey: '' })),
    ...(c.whatsappClientes
      ? { whatsappClientes: { ...c.whatsappClientes, metaToken: '', twilioAuthToken: '' } }
      : {}),
  };
}

/** Al restaurar integraciones, las claves se conservan de lo que ya hay en el sistema. */
function integracionesConClavesActuales(
  respaldo: ConfiguracionIntegraciones,
  actual: ConfiguracionIntegraciones,
): ConfiguracionIntegraciones {
  const claveOtro = new Map((actual.whatsappOtros ?? []).map((o) => [o.telefono, o.apiKey]));
  return {
    ...respaldo,
    whatsappApiKey: actual.whatsappApiKey,
    whatsappOtros: (respaldo.whatsappOtros ?? []).map((o) => ({ ...o, apiKey: claveOtro.get(o.telefono) ?? '' })),
    ...(respaldo.whatsappClientes
      ? {
          whatsappClientes: {
            ...respaldo.whatsappClientes,
            metaToken: actual.whatsappClientes?.metaToken ?? '',
            twilioAuthToken: actual.whatsappClientes?.twilioAuthToken ?? '',
          },
        }
      : {}),
  };
}

/** Correo entrante sin secretos de Zoho ni la clave del webhook. */
function correoEntranteSinClaves(c: ConfiguracionCorreoEntrante): ConfiguracionCorreoEntrante {
  return { ...c, clientSecret: '', refreshToken: '', webhookKey: '' };
}

const arr = (v: unknown): Record<string, unknown>[] => (Array.isArray(v) ? (v as Record<string, unknown>[]) : []);

/** Secciones que `restaurar()` lee; un archivo sin ninguna como arreglo no es un backup de ds-hd. */
const SECCIONES_BACKUP = [
  'empresas', 'contactos', 'tickets', 'cotizaciones', 'oportunidades', 'versiones', 'kb', 'usuarios',
  'eventos', 'tareas', 'interacciones', 'avisosVersiones',
];

/**
 * Rechaza un archivo que no tenga la forma de `exportar()`. Sin esto, un respaldo del CRM viejo
 * (`{ version, app, fecha, datos: {...} }`) "se restauraba" con 0 en todo y sin ningún aviso.
 */
function validarFormaBackup(datos: Record<string, unknown>): void {
  if (SECCIONES_BACKUP.some((k) => Array.isArray(datos[k]))) return;
  // La última tanda de una restauración por partes solo trae la configuración.
  if (datos._parcial === false && typeof datos.configuracion === 'object' && datos.configuracion !== null) return;
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

/** Fecha de primer nivel del JSON (texto ISO) a `Date`; sin valor → `undefined`. */
function aFecha(v: unknown): Date | undefined {
  if (v instanceof Date) return v;
  if (typeof v === 'string' || typeof v === 'number') {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? undefined : d;
  }
  return undefined;
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
    private readonly extra?: ReposExtraBackup,
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
    const { eventos, inscripcionesEventos, listaNegraEventos } = await this.exportarEventos();
    const otros = await this.exportarOtros();
    const [kbCfg, integraciones, correoEntrante] = await Promise.all([
      this.configuracion.obtenerKB(),
      this.configuracion.obtenerIntegraciones(),
      this.configuracion.obtenerCorreoEntrante(),
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
      // Eventos con sus invitados (links personales, pases y confirmaciones van DENTRO del evento),
      // los registrados por el link abierto y los correos bloqueados.
      eventos,
      inscripcionesEventos,
      listaNegraEventos,
      ...otros,
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
        kb: kbCfg,
        // Sin llaves de API ni secretos: al restaurar se conservan los que ya tenga el sistema.
        integraciones: integracionesSinClaves(integraciones),
        correoEntrante: correoEntranteSinClaves(correoEntrante),
      },
    };
  }

  /** Eventos, inscripciones de todos los eventos y lista negra (vacío si no hay repos). */
  private async exportarEventos(): Promise<{
    eventos: Evento[];
    inscripcionesEventos: Inscripcion[];
    listaNegraEventos: EntradaListaNegra[];
  }> {
    if (!this.extra) return { eventos: [], inscripcionesEventos: [], listaNegraEventos: [] };
    const r = this.extra;
    const [eventos, listaNegraEventos] = await Promise.all([r.eventos.list(), r.listaNegra.list()]);
    // Una sola consulta para todos los eventos: el Worker tiene tope de consultas por petición.
    const inscripcionesEventos = eventos.length ? await r.inscripciones.listTodas() : [];
    return { eventos, inscripcionesEventos, listaNegraEventos };
  }

  /**
   * Avisos enviados, tareas, interacciones, pizarras de KB, filtros guardados y bitácora. Cada
   * colección en UNA consulta: el Worker tiene tope de consultas por petición (nada por usuario).
   */
  private async exportarOtros(): Promise<{
    avisosVersiones: AvisoEnviado[];
    tareas: Tarea[];
    interacciones: Interaccion[];
    pizarrasKB: PizarraKB[];
    filtrosGuardados: FiltroGuardado[];
    bitacora: EntradaBitacora[];
    notasPersonales: { uid: string; notas: NotaPersonal[] }[];
  }> {
    const r = this.extra;
    if (!r) return { avisosVersiones: [], tareas: [], interacciones: [], pizarrasKB: [], filtrosGuardados: [], bitacora: [], notasPersonales: [] };
    const [avisosVersiones, tareas, interacciones, pizarras, filtros, bitacora, notasPersonales] = await Promise.all([
      r.avisos.listTodos(),
      r.tareas.list(),
      r.interacciones.listRecientes(MAX_INTERACCIONES),
      r.pizarras.listarTodas(),
      r.filtros.listarTodos(),
      r.bitacora.listar({ limite: MAX_BITACORA }),
      r.notas ? r.notas.listarTodas() : Promise.resolve([]),
    ]);
    return {
      avisosVersiones,
      tareas,
      interacciones,
      pizarrasKB: pizarras.filter((p) => p.contenido.trim() !== ''),
      filtrosGuardados: filtros,
      bitacora,
      notasPersonales,
    };
  }

  /** Restaura avisos, tareas, interacciones, pizarras y filtros (todo upsert por id). */
  private async restaurarOtros(datos: Record<string, unknown>, resumen: ResumenRestauracion): Promise<void> {
    const r = this.extra;
    if (!r) return;
    const avisos = arr(datos.avisosVersiones) as unknown as AvisoEnviado[];
    // En lotes: cada registrar() es un solo batch de Firestore (máx. 500 escrituras).
    for (let i = 0; i < avisos.length; i += 400) {
      const lote = avisos.slice(i, i + 400);
      try {
        await r.avisos.registrar(lote);
        resumen.avisos += lote.length;
      } catch (err) {
        resumen.errores.push(`historial de avisos: ${err instanceof Error ? err.message : err}`);
      }
    }
    const bitacora = arr(datos.bitacora) as unknown as EntradaBitacora[];
    // Mismo id = misma entrada: restaurar dos veces no la duplica.
    for (let i = 0; i < bitacora.length; i += 400) {
      const lote = bitacora.slice(i, i + 400);
      try {
        await r.bitacora.registrarVarias(lote);
        resumen.bitacora += lote.length;
      } catch (err) {
        resumen.errores.push(`bitácora: ${err instanceof Error ? err.message : err}`);
      }
    }
    for (const d of arr(datos.tareas)) {
      try {
        await r.tareas.save(new Tarea(d as unknown as TareaProps));
        resumen.tareas++;
      } catch (err) {
        resumen.errores.push(`tarea "${d.titulo}": ${err instanceof Error ? err.message : err}`);
      }
    }
    for (const d of arr(datos.interacciones)) {
      try {
        await r.interacciones.create(new Interaccion(d as unknown as InteraccionProps));
        resumen.interacciones++;
      } catch (err) {
        resumen.errores.push(`seguimiento "${d.resumen}": ${err instanceof Error ? err.message : err}`);
      }
    }
    for (const d of arr(datos.pizarrasKB)) {
      try {
        await r.pizarras.guardar(d as unknown as PizarraKB);
      } catch (err) {
        resumen.errores.push(`pizarra de KB: ${err instanceof Error ? err.message : err}`);
      }
    }
    for (const d of arr(datos.filtrosGuardados)) {
      try {
        await r.filtros.guardar(d as unknown as FiltroGuardado);
      } catch (err) {
        resumen.errores.push(`filtro "${d.nombre}": ${err instanceof Error ? err.message : err}`);
      }
    }
    // Notas personales: una escritura por persona (todas sus notas van en un documento).
    for (const d of arr(datos.notasPersonales)) {
      if (!r.notas || typeof d.uid !== 'string') continue;
      try {
        const notas = (Array.isArray(d.notas) ? d.notas : []) as Record<string, unknown>[];
        await r.notas.guardar(
          d.uid,
          notas.map(notaDesdeDatos).filter((n): n is NotaPersonal => n !== null),
        );
      } catch (err) {
        resumen.errores.push(`notas personales: ${err instanceof Error ? err.message : err}`);
      }
    }
  }

  /**
   * Restaura eventos, inscripciones y lista negra. Se lee del JSON CRUDO (sin `reviveFechas`):
   * las fechas de los invitados viven como texto ISO dentro del evento y deben seguir siendo
   * texto; solo las fechas de primer nivel se convierten a `Date`. El token de cada invitado se
   * conserva, así que los links personales ya enviados siguen funcionando.
   */
  private async restaurarEventos(crudo: Record<string, unknown>, resumen: ResumenRestauracion): Promise<void> {
    const r = this.extra;
    if (!r) return;
    for (const d of arr(crudo.eventos)) {
      try {
        await r.eventos.save(
          new Evento({
            ...(d as unknown as EventoProps),
            fechaHora: aFecha(d.fechaHora) ?? new Date(NaN),
            createdAt: aFecha(d.createdAt),
            updatedAt: aFecha(d.updatedAt),
          }),
        );
        resumen.eventos++;
      } catch (err) {
        resumen.errores.push(`evento "${d.titulo}": ${err instanceof Error ? err.message : err}`);
      }
    }
    for (const d of arr(crudo.inscripcionesEventos)) {
      try {
        await r.inscripciones.save({
          ...(d as unknown as Inscripcion),
          recordatoriosEnviados: Array.isArray(d.recordatoriosEnviados) ? d.recordatoriosEnviados.map(String) : [],
          createdAt: aFecha(d.createdAt) ?? this.clock.now(),
        });
        resumen.inscritos++;
      } catch (err) {
        resumen.errores.push(`registro "${d.nombre}" del evento: ${err instanceof Error ? err.message : err}`);
      }
    }
    for (const d of arr(crudo.listaNegraEventos)) {
      try {
        await r.listaNegra.agregar({
          ...(d as unknown as EntradaListaNegra),
          createdAt: aFecha(d.createdAt) ?? this.clock.now(),
        });
      } catch (err) {
        resumen.errores.push(`bloqueado "${d.email}": ${err instanceof Error ? err.message : err}`);
      }
    }
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
      eventos: 0,
      inscritos: 0,
      avisos: 0,
      tareas: 0,
      interacciones: 0,
      bitacora: 0,
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
        const det = detalle[ticket.id];
        conDetalle.push({ ticket, notas: det?.notas ?? [], eventos: det?.eventos ?? [] });
      } catch (err) {
        resumen.errores.push(`ticket #${d.numero}: ${err instanceof Error ? err.message : err}`);
      }
    }
    // Todos los tickets con su conversación en lotes (un commit por cada 500 escrituras), no uno
    // por uno: el Worker tiene tope de consultas por petición. Notas y eventos conservan su id,
    // así que restaurar dos veces no duplica la conversación.
    if (conDetalle.length) {
      try {
        await this.ticketRepo.guardarVariosConDetalle(conDetalle);
        resumen.tickets += conDetalle.length;
        maxNumero = Math.max(...conDetalle.map((c) => c.ticket.numero));
      } catch (err) {
        resumen.errores.push(`tickets: ${err instanceof Error ? err.message : err}`);
      }
    }
    // El folio nunca baja: si el sistema ya va más adelante, se respeta (evita folios repetidos).
    if (maxNumero > 0 && maxNumero > (await this.contador.actual(CONTADOR_TICKETS))) {
      await this.contador.fijar(CONTADOR_TICKETS, maxNumero);
    }
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
    await this.restaurarEventos(datosCrudos, resumen);
    await this.restaurarOtros(datos, resumen);
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
    if (cfg.kb) await this.configuracion.guardarKB(cfg.kb as never);
    // Integraciones y correo entrante: el respaldo no trae claves; se conservan las actuales.
    if (cfg.integraciones) {
      const actual = await this.configuracion.obtenerIntegraciones();
      await this.configuracion.guardarIntegraciones(
        integracionesConClavesActuales(cfg.integraciones as ConfiguracionIntegraciones, actual),
      );
    }
    if (cfg.correoEntrante) {
      const actual = await this.configuracion.obtenerCorreoEntrante();
      await this.configuracion.guardarCorreoEntrante({
        ...(cfg.correoEntrante as ConfiguracionCorreoEntrante),
        clientSecret: actual.clientSecret,
        refreshToken: actual.refreshToken,
        webhookKey: actual.webhookKey,
        // Hasta dónde se revisó Zoho es estado vivo: no se regresa a una fecha vieja.
        zohoRevisadoHasta: actual.zohoRevisadoHasta,
        ultimaRevision: actual.ultimaRevision,
      });
    }

    // Restauración por partes (la página manda tandas): solo la última deja huella en la
    // bitácora, con los totales de todas las tandas que la página le pasa en `_totalesPrevios`.
    if (datosCrudos._parcial !== true) {
      const previos = (datosCrudos._totalesPrevios ?? {}) as Record<string, unknown>;
      const totales: Record<string, number> = {};
      for (const [k, n] of Object.entries(resumen)) {
        if (typeof n === 'number') totales[k] = n + (typeof previos[k] === 'number' ? (previos[k] as number) : 0);
      }
      await this.bitacora?.registrar({
        actor, accion: 'restaurar', modulo: 'backup', entidadTipo: 'Backup', entidadId: '-',
        resumen: `Backup restaurado: ${Object.entries(totales).filter(([, n]) => n > 0).map(([k, n]) => `${n} ${k}`).join(', ') || 'sin cambios'}`,
      });
    }
    return resumen;
  }
}
