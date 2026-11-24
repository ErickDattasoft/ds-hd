import type { Request, Response } from 'express';
import type { EventoService } from '../../../../application/eventos/EventoService.js';
import { ConflictError } from '../../../../core/errors/DomainError.js';
import type { Evento } from '../../../../core/entities/Evento.js';
import { ZONA_MEXICO } from '../../../../core/entities/value-objects/horaMexico.js';
import { camposDeError } from '../../support/errores.js';

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

/** IP del cliente: `CF-Connecting-IP` en Cloudflare, si no lo que resuelva Express (`X-Forwarded-For`/socket). */
const clientIp = (req: Request): string => {
  const cf = req.headers['cf-connecting-ip'];
  return (typeof cf === 'string' && cf) || req.ip || '';
};

/** Duración supuesta del evento para el calendario (no se captura la hora de fin). */
const DURACION_MS = 2 * 60 * 60 * 1000;

const fechaIcs = (d: Date): string => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const escaparIcs = (t: string): string => t.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/([,;])/g, '\\$1');

/** Dónde es: el lugar (presencial) o la liga (webinar), para el calendario. */
const ubicacion = (e: Evento): string =>
  e.tipo === 'presencial'
    ? [e.lugarNombre, e.lugarDireccion].filter(Boolean).join(', ')
    : (e.urlWebinar ?? '');

/** Link de «Agregar a Google Calendar». */
export const linkGoogleCalendar = (e: Evento): string => {
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text: e.titulo,
    dates: `${fechaIcs(e.fechaHora)}/${fechaIcs(new Date(e.fechaHora.getTime() + DURACION_MS))}`,
    details: e.descripcion ?? '',
    location: ubicacion(e),
  });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
};

/** Datos que comparten la página general y la invitación personal. */
/** Quien tiene sesión con permiso de eventos está revisando, no es el invitado. */
const esStaff = (req: Request): boolean => Boolean(req.user?.permisos?.includes('eventos:gestionar'));

const vistaContenido = (e: Evento) => ({
  googleCalendar: linkGoogleCalendar(e),
  fechaIso: e.fechaHora.toISOString(),
});

/** Comunicado: sus links llevan directo al link de CONTPAQi. Devuelve si ya redirigió. */
const irAlComunicado = (res: Response, e: Evento): boolean => {
  if (!e.esComunicado || !e.urlComunicado) return false;
  res.redirect(302, e.urlComunicado);
  return true;
};

/** Landing pública de eventos y formulario de registro. */
export class EventoPublicoController {
  constructor(
    private readonly eventos: EventoService,
    private readonly turnstileSiteKey: string,
  ) {}

  /**
   * Datos de la página + la tarjeta de vista previa (Open Graph) que muestran Facebook, WhatsApp,
   * LinkedIn, etc. al pegar el link: título, fecha/lugar y el flayer (o el logo).
   */
  private vista(e: Evento) {
    const fecha = new Intl.DateTimeFormat('es-MX', {
      timeZone: ZONA_MEXICO, weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit',
    }).format(e.fechaHora);
    const partes = [
      e.tipo !== 'felicitacion' ? `📅 ${fecha}` : '',
      e.tipo === 'presencial' && e.lugarNombre ? `📍 ${e.lugarNombre}` : '',
      e.descripcion ? e.descripcion.replace(/\s+/g, ' ').slice(0, 160) : '',
    ].filter(Boolean);
    return {
      ...vistaContenido(e),
      og: {
        titulo: e.titulo,
        descripcion: partes.join(' · '),
        imagen: this.eventos.urlAbsoluta(e.flayer ? `/eventos/${e.id}/flayer?v=${e.flayer.tamano}` : '/logo'),
        grande: Boolean(e.flayer),
      },
    };
  }

  listar = async (_req: Request, res: Response): Promise<void> => {
    const eventos = (await this.eventos.listar(true)).filter(
      (e) => e.estado === 'publicado' && e.abiertoARegistro && !e.esPrueba && !e.esComunicado,
    );
    res.render('pages/public/eventos-list', { titulo: 'Próximos eventos', eventos });
  };

  detalle = async (req: Request, res: Response): Promise<void> => {
    const evento = await this.eventos.obtener(str(req.params.id));
    if (irAlComunicado(res, evento)) return;
    res.render('pages/public/evento', {
      titulo: evento.titulo,
      evento,
      turnstileSiteKey: this.turnstileSiteKey,
      navMinima: true,
      volverA: `/app/eventos/${evento.id}`,
      valores: {},
      errores: {},
      registrado: false,
      ...this.vista(evento),
    });
  };

  /** Archivo .ics para agregar el evento a Outlook / Apple / cualquier calendario. */
  calendarioIcs = async (req: Request, res: Response): Promise<void> => {
    const e = await this.eventos.obtener(str(req.params.id));
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//DATTASOFT//Eventos//ES',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${e.id}@dattasoft`,
      `DTSTAMP:${fechaIcs(new Date())}`,
      `DTSTART:${fechaIcs(e.fechaHora)}`,
      `DTEND:${fechaIcs(new Date(e.fechaHora.getTime() + DURACION_MS))}`,
      `SUMMARY:${escaparIcs(e.titulo)}`,
      e.descripcion ? `DESCRIPTION:${escaparIcs(e.descripcion)}` : '',
      ubicacion(e) ? `LOCATION:${escaparIcs(ubicacion(e))}` : '',
      'END:VEVENT',
      'END:VCALENDAR',
    ]
      .filter(Boolean)
      .join('\r\n');
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="evento.ics"');
    res.send(ics);
  };

  // ── Invitación personal (link con token) ───────────────────────────────
  invitacion = async (req: Request, res: Response): Promise<void> => {
    try {
      const { evento, nombre, inv } = await this.eventos.abrirInvitacion(
        str(req.params.id),
        str(req.params.token),
        esStaff(req),
      );
      // Comunicado: ya quedó «👁 La abrió»; se va directo al link de CONTPAQi.
      if (irAlComunicado(res, evento)) return;
      this.renderInvitacion(res, evento, nombre, inv, {
        cambiar: req.query.cambiar === '1',
        recienEnviada: req.query.ok === '1',
      });
    } catch {
      res.status(404).render('pages/public/invitacion-evento', { titulo: 'Invitación', evento: null, navMinima: true });
    }
  };

  invitacionPost = async (req: Request, res: Response): Promise<void> => {
    const id = str(req.params.id);
    const token = str(req.params.token);
    const b = req.body ?? {};
    try {
      // La invitación manda solo «personas» (0 = ninguna, no van); «asistira» queda por compatibilidad.
      const personas = Number(str(b.personas) || 1);
      await this.eventos.responderInvitacion(id, token, {
        asistira: str(b.asistira) ? str(b.asistira) === 'si' : personas > 0,
        personas: Math.max(1, personas),
        nombre: str(b.nombre),
        mensaje: str(b.mensaje),
      });
      res.redirect(303, `/eventos/${encodeURIComponent(id)}/i/${encodeURIComponent(token)}?ok=1`);
    } catch (err) {
      try {
        const { evento, nombre, inv } = await this.eventos.abrirInvitacion(id, token, true);
        res.status(422);
        this.renderInvitacion(res, evento, nombre, inv, { cambiar: true, valores: b, errores: camposDeError(err) });
      } catch {
        res.status(404).render('pages/public/invitacion-evento', { titulo: 'Invitación', evento: null, navMinima: true });
      }
    }
  };

  /**
   * 👁 Vista previa (staff, `/app/eventos/:id/vista-previa`): la invitación como la verá un
   * invitado, con nombre de ejemplo y las personas por invitación del evento. Sirve en borrador y no guarda nada.
   */
  vistaPrevia = async (req: Request, res: Response): Promise<void> => {
    const evento = await this.eventos.obtener(str(req.params.id));
    if (irAlComunicado(res, evento)) return;
    const inv = {
      pases: evento.pideConfirmacion ? evento.maxPersonasRegistro : 1,
      respuesta: 'pendiente',
      personas: null,
      respondioNombre: null,
      mensaje: null,
      token: 'vista-previa',
    };
    const nombre = str(req.query.nombre).trim().slice(0, 60) || 'Juan Pérez';
    this.renderInvitacion(res, evento, nombre, inv, { vistaPrevia: true });
  };

  private renderInvitacion(
    res: Response,
    evento: Evento,
    nombre: string,
    inv: { pases: number; respuesta: string; personas: number | null; respondioNombre: string | null; mensaje: string | null; token: string | null },
    extra: { cambiar?: boolean; recienEnviada?: boolean; valores?: Record<string, unknown>; errores?: Record<string, string>; vistaPrevia?: boolean },
  ): void {
    const contesto = inv.respuesta === 'asistira' || inv.respuesta === 'no_asistira';
    res.render('pages/public/invitacion-evento', {
      titulo: evento.titulo,
      evento,
      nombre,
      inv,
      contesto,
      mostrarFormulario: evento.pideConfirmacion && evento.estado !== 'cancelado' && (!contesto || extra.cambiar),
      recienEnviada: extra.recienEnviada ?? false,
      // Sin contestar no se preselecciona nada: el invitado elige cuántos van (o ninguno).
      valores: extra.valores ?? {
        asistira: !contesto ? '' : inv.respuesta === 'no_asistira' ? 'no' : 'si',
        personas: contesto && inv.respuesta === 'asistira' ? (inv.personas ?? 1) : '',
        nombre: inv.respondioNombre ?? '',
        mensaje: inv.mensaje ?? '',
      },
      errores: extra.errores ?? {},
      vistaPrevia: extra.vistaPrevia ?? false,
      navMinima: true,
      volverA: `/app/eventos/${evento.id}#invitaciones`,
      ...this.vista(evento),
    });
  }

  /** Ruta pública (sin sesión): así la página de registro y los correos pueden mostrar el flayer. */
  flayerGet = async (req: Request, res: Response): Promise<void> => {
    const evento = await this.eventos.obtener(str(req.params.id)).catch(() => null);
    if (!evento?.flayer) {
      res.status(404).end();
      return;
    }
    const base64 = evento.flayer.data.slice(evento.flayer.data.indexOf(',') + 1);
    res.setHeader('Content-Type', evento.flayer.contentType);
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.send(Buffer.from(base64, 'base64'));
  };

  registrarPost = async (req: Request, res: Response): Promise<void> => {
    const id = str(req.params.id);
    const b = req.body ?? {};
    try {
      await this.eventos.registrarPublico({
        eventoId: id,
        nombre: str(b.nombre),
        email: str(b.email),
        telefono: str(b.telefono),
        empresa: str(b.empresa),
        ...asistenciaPublica(b),
        usaSistema: str(b.usaSistema),
        fuente: str(b.fuente),
        deseaCanalWhatsapp: b.deseaCanalWhatsapp === 'on' || b.deseaCanalWhatsapp === 'true',
        captchaToken: str(b['cf-turnstile-response']),
        ip: clientIp(req),
      });
      const evento = await this.eventos.obtener(id);
      res.render('pages/public/evento', {
        titulo: evento.titulo,
        evento,
        turnstileSiteKey: this.turnstileSiteKey,
        navMinima: true,
        volverA: `/app/eventos/${evento.id}`,
        valores: {},
        errores: {},
        registrado: true,
        ...this.vista(evento),
      });
    } catch (err) {
      const evento = await this.eventos.obtener(id).catch(() => null);
      res.status(422).render('pages/public/evento', {
        titulo: evento?.titulo ?? 'Evento',
        evento,
        turnstileSiteKey: this.turnstileSiteKey,
        navMinima: true,
        volverA: `/app/eventos/${id}`,
        valores: b,
        errores: camposDeError(err),
        registrado: false,
        duplicado: err instanceof ConflictError,
        ...(evento ? this.vista(evento) : {}),
      });
    }
  };

  /** Reenvía la confirmación si el correo ya está registrado — respuesta genérica siempre,
   *  no revela si el correo existe (evita enumeración), igual que el CRM viejo. */
  reenviarLinkPost = async (req: Request, res: Response): Promise<void> => {
    const id = str(req.params.id);
    const correo = str(req.body?.correo);
    if (correo) await this.eventos.reenviarLinkPublico(id, correo).catch(() => {});
    res.json({
      ok: true,
      mensaje:
        'Si el correo está registrado en este evento, te reenviamos el acceso en unos segundos.',
    });
  };
}

/**
 * Traduce la pregunta única del link abierto («asistencia»: un número de personas, «No» o
 * «Tal vez») a asistira + personas. Si no viene, usa los campos sueltos de antes.
 */
export function asistenciaPublica(b: Record<string, unknown>): { asistira: string; personas: number } {
  const a = str(b.asistencia);
  if (!a) return { asistira: str(b.asistira), personas: Number(str(b.personas) || 1) };
  const n = Number(a);
  if (Number.isFinite(n) && n >= 1) return { asistira: 'Sí', personas: Math.trunc(n) };
  return { asistira: a === 'No' ? 'No' : 'Tal vez', personas: 1 };
}
