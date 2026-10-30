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
import { ForbiddenError, ValidationError } from '../../core/errors/DomainError.js';
import type { IAdjuntoTicketRepository } from '../../core/ports/repositories/IAdjuntoTicketRepository.js';
import type { ITicketPublicoRepository } from '../../core/ports/repositories/ITicketPublicoRepository.js';
import type { IUsuarioRepository } from '../../core/ports/repositories/IUsuarioRepository.js';
import type { IEmailSender } from '../../core/ports/services/IEmailSender.js';
import type { Ticket } from '../../core/entities/Ticket.js';
import {
  sanearNombreArchivo,
} from '../../core/entities/AdjuntoTicket.js';
import { MAX_DATAURL_IMAGEN_PUBLICO, MAX_IMAGENES_PUBLICO } from '../../core/entities/TicketPublico.js';
import { registrarEvento } from './efectos.js';
import type { RespuestasSinLeerService } from './RespuestasSinLeerService.js';
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
  /** Buzón «🔔 Respuestas» del CRM: la respuesta de un cliente queda como sin leer. */
  respuestas?: RespuestasSinLeerService;
  /**
   * Direcciones desde las que el CRM manda correo. Si llega algo DE ellas es nuestro propio aviso
   * reenviado: se ignora. Sin esta barrera el CRM viejo entró en bucle el 2026-10-02 (~20 correos
   * en minutos) porque el aviso de "nueva respuesta" coincidía con el filtro de Zoho.
   */
  remitentesPropios?: readonly string[];
  /** Secreto `CORREO_ENTRANTE_SECRET` del servidor (si existe). Vale además de la clave generada en Configuración. */
  secretoServidor?: string;
  /**
   * ¿El proveedor de correo deja mandar desde este remitente? Si no se inyecta, se guarda sin
   * comprobar (dev/SMTP).
   */
  verificarRemitente?: (email: string) => Promise<{ ok: boolean; detalle: string }>;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Qué pasó con un correo recibido por webhook. */
export type ResultadoWebhookCorreo =
  | { accion: 'nota'; ticket: number }
  | { accion: 'solicitud'; folio: string }
  | { accion: 'ignorado'; motivo: string };

/** Tope de imágenes por respuesta. */
const MAX_IMAGENES_RESPUESTA = 5;
/**
 * Tope por imagen que llega por correo: una foto del celular pesa 2–4 MB. Más que el de los
 * adjuntos subidos en el CRM (que el navegador reduce antes): se guarda en trozos.
 */
const MAX_IMAGEN_CORREO_BYTES = 5 * 1024 * 1024;

const megas = (bytes: number): string => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

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

  /** ¿El webhook de CloudMailin está habilitado (hay secreto del servidor o clave generada)? */
  webhookActivo(cfg: ConfiguracionCorreoEntrante): boolean {
    return !!this.deps.secretoServidor || !!cfg.webhookKey;
  }

  /** ¿`key` abre el webhook? Vale el secreto del servidor o la clave generada en Configuración. */
  async claveWebhookValida(key: unknown): Promise<boolean> {
    if (typeof key !== 'string' || !key) return false;
    if (this.deps.secretoServidor && key === this.deps.secretoServidor) return true;
    const cfg = await this.config.obtenerCorreoEntrante();
    return !!cfg.webhookKey && key === cfg.webhookKey;
  }

  /**
   * ¿Lo mandó el propio CRM? (ver {@link DepsCorreoEntrante.remitentesPropios}; también el
   * remitente elegido en Configuración).
   */
  private esRemitentePropio(correo: string, cfg: ConfiguracionCorreoEntrante): boolean {
    const de = correo.trim().toLowerCase();
    const propios = [...(this.deps.remitentesPropios ?? []), cfg.remitenteEmail];
    return !!de && propios.some((r) => !!r && r.trim().toLowerCase() === de);
  }

  /**
   * Un correo que llegó por webhook (CloudMailin). Con número de ticket → nota en ese ticket;
   * sin número → solicitud en el buzón de tickets públicos, para convertirla o descartarla a mano
   * (nunca se crea un ticket solo). No depende de "habilitado": el webhook ya es la decisión.
   */
  async recibirWebhook(correo: CorreoRecibido): Promise<ResultadoWebhookCorreo> {
    if (!correo.de) return { accion: 'ignorado', motivo: 'sin remitente' };
    const cfg = await this.config.obtenerCorreoEntrante();
    if (this.esRemitentePropio(correo.de, cfg)) {
      this.logger.info('Correo entrante ignorado: lo mandó el propio CRM (anti-bucle)', { de: correo.de });
      return { accion: 'ignorado', motivo: 'remitente es el propio CRM' };
    }
    if (numeroTicketDeAsunto(correo.asunto)) {
      const motivo = await this.procesar(correo, cfg);
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
      const motivo = await this.procesar(correo, cfg);
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
  private async procesar(correo: CorreoRecibido, cfg: ConfiguracionCorreoEntrante): Promise<string | null> {
    const numero = numeroTicketDeAsunto(correo.asunto);
    if (!numero) return 'el asunto no trae número de ticket';
    const ticket = await this.tickets.findByNumero(numero);
    if (!ticket) return `no existe el ticket #${numero}`;
    if (this.esRemitentePropio(correo.de, cfg)) return 'remitente es el propio CRM';
    if (cfg.soloContactoDelTicket) {
      const permitidos = [ticket.contactoCorreo ?? '', ...ticket.cc, ...ticket.cco]
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);
      // Un usuario activo del CRM (p. ej. un agente que venía en copia) también puede contestar.
      if (!permitidos.includes(correo.de) && !(await this.esDelEquipo(correo.de))) {
        return `${correo.de} no es el contacto del ticket #${numero}`;
      }
    }
    // Si el recorte dejó todo vacío (todo era cita), mejor guardar el texto completo que perderlo.
    const texto = cuerpoSinCita(correo.cuerpo) || correo.cuerpo.trim();
    const { ids: adjuntoIds, omitidos } = await this.guardarImagenes(ticket, correo);
    // Lo que no se pudo guardar se dice en la nota: si no, la imagen "desaparece" sin aviso.
    const noGuardados = [...(correo.omitidos ?? []), ...omitidos];
    const cuerpo = [texto, ...noGuardados.map((o) => `📎 No se guardó «${o.nombre}»: ${o.motivo}.`)]
      .filter(Boolean)
      .join('\n\n');
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
    // Lo que contesta el propio equipo (un agente en copia) no es una respuesta pendiente de leer.
    if (this.deps.respuestas && !(await this.esDelEquipo(correo.de))) {
      await this.deps.respuestas.registrar(ticket, nombre, cuerpo || '(imagen adjunta)', correo.recibidoEn);
    }
    await this.avisarEquipo(ticket, nombre, cuerpo);
    return null;
  }

  /** ¿`correo` es de un usuario activo del equipo (staff) del CRM? */
  private async esDelEquipo(correo: string): Promise<boolean> {
    if (!this.deps.usuarios) return false;
    return this.deps.usuarios.findByEmail(correo).then((u) => !!u?.activo && u.esStaff).catch(() => false);
  }

  /** Guarda las imágenes del correo como adjuntos del ticket (≤5 MB c/u, máx. 5) y dice cuáles no. */
  private async guardarImagenes(
    ticket: Ticket,
    correo: CorreoRecibido,
  ): Promise<{ ids: string[]; omitidos: { nombre: string; motivo: string }[] }> {
    const repo = this.deps.adjuntos;
    const ids: string[] = [];
    const omitidos: { nombre: string; motivo: string }[] = [];
    if (!repo || !correo.adjuntos?.length) return { ids, omitidos };
    for (const [i, a] of correo.adjuntos.entries()) {
      if (i >= MAX_IMAGENES_RESPUESTA) {
        omitidos.push({ nombre: a.nombre, motivo: `solo se guardan ${MAX_IMAGENES_RESPUESTA} imágenes por correo` });
        continue;
      }
      const base64 = a.base64 || (a.url ? await this.descargar(a.url).catch(() => '') : '');
      if (!base64) {
        omitidos.push({ nombre: a.nombre, motivo: 'no se pudo descargar' });
        continue;
      }
      const tamano = Math.floor((base64.length * 3) / 4);
      if (tamano > MAX_IMAGEN_CORREO_BYTES) {
        this.logger.warn('Imagen de correo omitida por tamaño', { ticket: ticket.numero, nombre: a.nombre, tamano });
        omitidos.push({ nombre: a.nombre, motivo: `pesa ${megas(tamano)} (máximo ${megas(MAX_IMAGEN_CORREO_BYTES)})` });
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
          data: `data:${a.contentType};base64,${base64}`,
          subidoPorUid: null,
          subidoPorNombre: correo.nombreDe || correo.de,
          createdAt: this.clock.now(),
        });
        ids.push(id);
      } catch (err) {
        this.logger.warn('No se pudo guardar imagen de correo', { ticket: ticket.numero, err: String(err) });
        omitidos.push({ nombre: a.nombre, motivo: 'no se pudo guardar' });
      }
    }
    return { ids, omitidos };
  }

  /** Contenido (base64) de un adjunto que el proveedor dejó en su almacén. */
  private async descargar(url: string): Promise<string> {
    const r = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return Buffer.from(await r.arrayBuffer()).toString('base64');
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
    datos: Omit<ConfiguracionCorreoEntrante, 'ultimaRevision' | 'ultimoResultado' | 'remitenteEmail' | 'remitenteNombre' | 'webhookKey'>,
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

  /**
   * Cambia el remitente de todo el correo del CRM. Antes de guardarlo pregunta al proveedor si lo
   * acepta: un remitente sin verificar en Brevo haría que NINGÚN correo saliera. Vacío = volver al
   * del servidor. Devuelve el detalle de la comprobación para mostrarlo.
   */
  async guardarRemitente(actor: SessionUser, datos: { email: string; nombre: string }): Promise<string> {
    this.permiso(actor);
    const email = datos.email.trim().toLowerCase();
    const nombre = datos.nombre.trim();
    if (email && !EMAIL_RE.test(email)) throw new ValidationError('Escribe un correo de remitente válido', { remitenteEmail: 'Correo inválido' });
    let detalle = email ? 'guardado sin comprobar (el servidor no usa Brevo)' : 'se usa el remitente del servidor';
    if (email && this.deps.verificarRemitente) {
      const v = await this.deps.verificarRemitente(email);
      if (!v.ok) throw new ValidationError(`No se cambió el remitente: ${v.detalle}.`, { remitenteEmail: v.detalle });
      detalle = v.detalle;
    }
    const previa = await this.config.obtenerCorreoEntrante();
    await this.config.guardarCorreoEntrante({ ...previa, remitenteEmail: email, remitenteNombre: nombre });
    return detalle;
  }

  /** Genera (o rota) la clave `?key=` del webhook de CloudMailin. La anterior deja de servir. */
  async generarClaveWebhook(actor: SessionUser): Promise<string> {
    this.permiso(actor);
    const clave = this.ids.newToken();
    const previa = await this.config.obtenerCorreoEntrante();
    await this.config.guardarCorreoEntrante({ ...previa, webhookKey: clave });
    return clave;
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
