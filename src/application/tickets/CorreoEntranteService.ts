import type { ITicketRepository } from '../../core/ports/repositories/ITicketRepository.js';
import type { IConfiguracionRepository } from '../../core/ports/repositories/IConfiguracionRepository.js';
import type { IBuzonEntrante, CorreoRecibido } from '../../core/ports/services/IBuzonEntrante.js';
import type { IClock } from '../../core/ports/services/IClock.js';
import type { IIdGenerator } from '../../core/ports/services/IIdGenerator.js';
import type { ILogger } from '../../core/ports/services/ILogger.js';
import {
  cuerpoSinCita,
  numeroTicketDeAsunto,
  type ConfiguracionCorreoEntrante,
} from '../../core/entities/ConfiguracionCorreoEntrante.js';
import { ForbiddenError } from '../../core/errors/DomainError.js';
import type { IAdjuntoTicketRepository } from '../../core/ports/repositories/IAdjuntoTicketRepository.js';
import type { ITicketPublicoRepository } from '../../core/ports/repositories/ITicketPublicoRepository.js';
import type { IUsuarioRepository } from '../../core/ports/repositories/IUsuarioRepository.js';
import type { IEmailSender } from '../../core/ports/services/IEmailSender.js';
import type { Ticket } from '../../core/entities/Ticket.js';
import {
  MAX_ADJUNTO_BYTES,
  sanearNombreArchivo,
} from '../../core/entities/AdjuntoTicket.js';
import { MAX_DATAURL_IMAGEN_PUBLICO, MAX_IMAGENES_PUBLICO } from '../../core/entities/TicketPublico.js';
import { registrarEvento } from './efectos.js';
import type { SessionUser } from '../shared/SessionUser.js';

/** Dependencias extra del correo entrante por webhook (CloudMailin). Opcionales en el sondeo. */
export interface DepsCorreoEntrante {
  adjuntos?: IAdjuntoTicketRepository;
  /** Buzón de tickets públicos: ahí caen los correos sin número de ticket (solicitudes). */
  solicitudes?: ITicketPublicoRepository;
  /** Para aceptar respuestas de usuarios del CRM (agentes en copia) aunque no sean el contacto. */
  usuarios?: IUsuarioRepository;
  /** Aviso al equipo de que llegó una respuesta. */
  email?: IEmailSender;
  /**
   * Direcciones desde las que el CRM manda correo. Si llega algo DE ellas es nuestro propio aviso
   * reenviado: se ignora. Sin esta barrera el CRM viejo entró en bucle el 2026-10-02 (~20 correos
   * en minutos) porque el aviso de "nueva respuesta" coincidía con el filtro de Zoho.
   */
  remitentesPropios?: readonly string[];
  /** ¿Está puesta la clave del webhook (`CORREO_ENTRANTE_SECRET`)? Solo para mostrarlo en Configuración. */
  webhookActivo?: boolean;
}

/** Qué pasó con un correo recibido por webhook. */
export type ResultadoWebhookCorreo =
  | { accion: 'nota'; ticket: number }
  | { accion: 'solicitud'; folio: string }
  | { accion: 'ignorado'; motivo: string };

/** Tope de imágenes por respuesta: cada una es un doc de hasta ~1 MiB. */
const MAX_IMAGENES_RESPUESTA = 5;

const e = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Qué se hizo con cada correo revisado. */
export interface ResultadoCorreoEntrante {
  revisados: number;
  agregados: number;
  /** Correos que no se pudieron ligar a un ticket, con el motivo. */
  omitidos: { asunto: string; de: string; motivo: string }[];
}

const LIMITE = 25;

/**
 * Convierte las respuestas que llegan al buzón de soporte en notas del ticket correspondiente.
 *
 * Reglas: el asunto debe traer el número de ticket (los correos del CRM ya lo llevan) y, si está
 * activado `soloContactoDelTicket`, el remitente debe ser el contacto del ticket o alguno de sus
 * CC — así un tercero no puede escribir en un ticket ajeno solo con adivinar el número.
 */
export class CorreoEntranteService {
  constructor(
    private readonly tickets: ITicketRepository,
    private readonly config: IConfiguracionRepository,
    private readonly buzon: IBuzonEntrante,
    private readonly ids: IIdGenerator,
    private readonly clock: IClock,
    private readonly logger: ILogger,
    private readonly deps: DepsCorreoEntrante = {},
  ) {}

  /** ¿El webhook de CloudMailin está habilitado (tiene clave)? */
  get webhookActivo(): boolean {
    return this.deps.webhookActivo === true;
  }

  /** ¿Lo mandó el propio CRM? (ver {@link DepsCorreoEntrante.remitentesPropios}). */
  private esRemitentePropio(correo: string): boolean {
    const de = correo.trim().toLowerCase();
    return !!de && (this.deps.remitentesPropios ?? []).some((r) => r.trim().toLowerCase() === de);
  }

  /**
   * Un correo que llegó por webhook (CloudMailin). Con número de ticket → nota en ese ticket;
   * sin número → solicitud en el buzón de tickets públicos, para convertirla o descartarla a mano
   * (nunca se crea un ticket solo). No depende de "habilitado": el webhook ya es la decisión.
   */
  async recibirWebhook(correo: CorreoRecibido): Promise<ResultadoWebhookCorreo> {
    if (!correo.de) return { accion: 'ignorado', motivo: 'sin remitente' };
    if (this.esRemitentePropio(correo.de)) {
      this.logger.info('Correo entrante ignorado: lo mandó el propio CRM (anti-bucle)', { de: correo.de });
      return { accion: 'ignorado', motivo: 'remitente es el propio CRM' };
    }
    const cfg = await this.config.obtenerCorreoEntrante();
    if (numeroTicketDeAsunto(correo.asunto)) {
      const motivo = await this.procesar(correo, cfg.soloContactoDelTicket);
      if (motivo) {
        this.logger.warn('Correo entrante no ligado', { de: correo.de, asunto: correo.asunto, motivo });
        return { accion: 'ignorado', motivo };
      }
      return { accion: 'nota', ticket: numeroTicketDeAsunto(correo.asunto)! };
    }
    return this.crearSolicitud(correo);
  }

  /** Correo sin número de ticket → entrada del buzón (origen "correo"). */
  private async crearSolicitud(correo: CorreoRecibido): Promise<ResultadoWebhookCorreo> {
    if (!this.deps.solicitudes) return { accion: 'ignorado', motivo: 'el asunto no trae número de ticket' };
    const cuerpo = cuerpoSinCita(correo.cuerpo) || correo.cuerpo.trim();
    const imagenes = (correo.adjuntos ?? [])
      .map((a) => ({ nombre: sanearNombreArchivo(a.nombre), contentType: a.contentType, data: `data:${a.contentType};base64,${a.base64}` }))
      .filter((i) => i.data.length <= MAX_DATAURL_IMAGEN_PUBLICO)
      .slice(0, MAX_IMAGENES_PUBLICO);
    const folio = `COR-${this.clock.now().getTime().toString(36).toUpperCase()}`;
    await this.deps.solicitudes.create({
      folio,
      origen: 'correo',
      nombre: correo.nombreDe || correo.de,
      empresa: null,
      correo: correo.de,
      telefono: null,
      asunto: correo.asunto.trim() || '(sin asunto)',
      sistema: null,
      tipo: null,
      prioridad: 'Media',
      descripcion: cuerpo || '(correo sin texto)',
      ...(imagenes.length ? { imagenes } : {}),
    });
    this.logger.info('Solicitud de ticket por correo', { folio, de: correo.de });
    return { accion: 'solicitud', folio };
  }

  /** Revisa el buzón. `forzado` = lo pidió una persona desde Configuración (ignora "habilitado"). */
  async revisar(opts: { forzado?: boolean } = {}): Promise<ResultadoCorreoEntrante> {
    const cfg = await this.config.obtenerCorreoEntrante();
    const resultado: ResultadoCorreoEntrante = { revisados: 0, agregados: 0, omitidos: [] };
    if (!cfg.habilitado && !opts.forzado) return resultado;

    const correos = await this.buzon.listarNoLeidos(cfg, LIMITE);
    for (const correo of correos) {
      resultado.revisados++;
      const motivo = await this.procesar(correo, cfg.soloContactoDelTicket);
      if (motivo) {
        resultado.omitidos.push({ asunto: correo.asunto, de: correo.de, motivo });
        // No se marca como leído: queda en el buzón para atenderlo a mano.
        continue;
      }
      resultado.agregados++;
      try {
        await this.buzon.marcarLeido(cfg, correo);
      } catch (err) {
        this.logger.warn('No se pudo marcar el correo como leído', { id: correo.id, err: String(err) });
      }
    }

    const ahora = this.clock.now();
    await this.config.guardarCorreoEntrante({
      ...cfg,
      ultimaRevision: ahora.toISOString(),
      ultimoResultado: `${resultado.agregados} de ${resultado.revisados} agregados${
        resultado.omitidos.length ? `, ${resultado.omitidos.length} sin ligar` : ''
      }`,
    });
    if (resultado.revisados) this.logger.info('Correo entrante revisado', { ...resultado, omitidos: resultado.omitidos.length });
    return resultado;
  }

  /** `null` si quedó agregado al ticket; si no, el motivo por el que se omitió. */
  private async procesar(correo: CorreoRecibido, soloContacto: boolean): Promise<string | null> {
    const numero = numeroTicketDeAsunto(correo.asunto);
    if (!numero) return 'el asunto no trae número de ticket';
    const ticket = await this.tickets.findByNumero(numero);
    if (!ticket) return `no existe el ticket #${numero}`;
    if (this.esRemitentePropio(correo.de)) return 'remitente es el propio CRM';
    if (soloContacto) {
      const permitidos = [ticket.contactoCorreo ?? '', ...ticket.cc, ...ticket.cco]
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);
      // Un usuario activo del CRM (p. ej. un agente que venía en copia) también puede contestar.
      const esDelEquipo = !permitidos.includes(correo.de) && this.deps.usuarios
        ? await this.deps.usuarios.findByEmail(correo.de).then((u) => !!u?.activo && u.esStaff).catch(() => false)
        : false;
      if (!permitidos.includes(correo.de) && !esDelEquipo) {
        return `${correo.de} no es el contacto del ticket #${numero}`;
      }
    }
    // Si el recorte dejó todo vacío (todo era cita), mejor guardar el texto completo que perderlo.
    const cuerpo = cuerpoSinCita(correo.cuerpo) || correo.cuerpo.trim();
    const adjuntoIds = await this.guardarImagenes(ticket, correo);
    if (!cuerpo && !adjuntoIds.length) return 'el correo llegó vacío';

    const nombre = correo.nombreDe && correo.nombreDe !== correo.de ? correo.nombreDe : correo.de;
    await this.tickets.agregarNota(ticket.id, {
      id: this.ids.newId(),
      tipo: 'publica',
      cuerpo: cuerpo || '(imagen adjunta)',
      // Autor sintético: la nota la escribió alguien por correo, no un usuario del CRM.
      autorUid: 'correo-entrante',
      autorNombre: nombre,
      correoDe: correo.de,
      createdAt: correo.recibidoEn,
      ...(adjuntoIds.length ? { adjuntoIds } : {}),
    });
    await registrarEvento(this.tickets, this.ids, ticket.id, {
      tipo: 'correo',
      resumen: `💬 ${nombre} respondió por correo${adjuntoIds.length ? ` (${adjuntoIds.length} imagen(es))` : ''}`,
      actor: null,
      at: this.clock.now(),
    });
    await this.avisarEquipo(ticket, nombre, cuerpo);
    return null;
  }

  /** Guarda las imágenes del correo como adjuntos del ticket (≤700 KB c/u, máx. 5). */
  private async guardarImagenes(ticket: Ticket, correo: CorreoRecibido): Promise<string[]> {
    const repo = this.deps.adjuntos;
    if (!repo || !correo.adjuntos?.length) return [];
    const ids: string[] = [];
    for (const a of correo.adjuntos.slice(0, MAX_IMAGENES_RESPUESTA)) {
      const tamano = Math.floor((a.base64.length * 3) / 4);
      if (tamano > MAX_ADJUNTO_BYTES) {
        this.logger.warn('Imagen de correo omitida por tamaño', { ticket: ticket.numero, nombre: a.nombre, tamano });
        continue;
      }
      const id = this.ids.newId();
      try {
        await repo.crear({
          id,
          ticketId: ticket.id,
          nombre: sanearNombreArchivo(a.nombre),
          contentType: a.contentType,
          tamano,
          data: `data:${a.contentType};base64,${a.base64}`,
          subidoPorUid: null,
          subidoPorNombre: correo.nombreDe || correo.de,
          createdAt: this.clock.now(),
        });
        ids.push(id);
      } catch (err) {
        this.logger.warn('No se pudo guardar imagen de correo', { ticket: ticket.numero, err: String(err) });
      }
    }
    return ids;
  }

  /**
   * Avisa a los correos de notificación que llegó una respuesta. Sale desde el remitente del CRM,
   * así que si el filtro de Zoho lo vuelve a reenviar, la barrera anti-bucle lo descarta.
   */
  private async avisarEquipo(ticket: Ticket, nombre: string, cuerpo: string): Promise<void> {
    if (!this.deps.email) return;
    try {
      const cfg = await this.config.obtenerTickets();
      const para = cfg.correosNotificacion.map((c) => c.trim()).filter(Boolean).map((email) => ({ email }));
      if (!para.length) return;
      await this.deps.email.enviar({
        para,
        asunto: `💬 Respuesta de cliente — [Ticket #${ticket.numero}] ${ticket.asunto}`,
        html:
          `<p>💬 <strong>${e(nombre)}</strong> respondió el ticket <strong>#${ticket.numero}</strong> — ${e(ticket.asunto)}:</p>` +
          `<div style="background:#f9fafb;padding:12px;border-radius:6px;white-space:pre-wrap">${e(cuerpo.slice(0, 2000))}</div>`,
        tags: ['ticket-respuesta-cliente', `ticket-${ticket.numero}`],
      });
    } catch (err) {
      this.logger.warn('No se pudo avisar de la respuesta por correo', { ticket: ticket.numero, err: String(err) });
    }
  }

  private permiso(actor: SessionUser): void {
    if (!actor.permisos.includes('configuracion:integraciones')) {
      throw new ForbiddenError('No puedes configurar el correo entrante');
    }
  }

  /** Config actual (para la pantalla de Configuración). */
  async configuracion(actor: SessionUser): Promise<ConfiguracionCorreoEntrante> {
    this.permiso(actor);
    return this.config.obtenerCorreoEntrante();
  }

  /** Guarda la config; los secretos vacíos conservan el valor anterior. */
  async guardar(
    actor: SessionUser,
    datos: Omit<ConfiguracionCorreoEntrante, 'ultimaRevision' | 'ultimoResultado'>,
  ): Promise<void> {
    this.permiso(actor);
    const previa = await this.config.obtenerCorreoEntrante();
    await this.config.guardarCorreoEntrante({
      ...previa,
      ...datos,
      clientSecret: datos.clientSecret.trim() || previa.clientSecret,
      refreshToken: datos.refreshToken.trim() || previa.refreshToken,
      region: datos.region.trim() || 'com',
    });
  }

  /** Revisión pedida a mano desde Configuración (aunque esté deshabilitado el automático). */
  async revisarManual(actor: SessionUser): Promise<ResultadoCorreoEntrante> {
    this.permiso(actor);
    return this.revisar({ forzado: true });
  }

  /** Prueba las credenciales y guarda el `accountId` que devuelve Zoho. */
  async verificar(actor: SessionUser): Promise<{ accountId: string; correo: string }> {
    this.permiso(actor);
    const cfg = await this.config.obtenerCorreoEntrante();
    const datos = await this.buzon.verificar(cfg);
    if (datos.accountId !== cfg.accountId) {
      await this.config.guardarCorreoEntrante({ ...cfg, accountId: datos.accountId });
    }
    return datos;
  }
}
