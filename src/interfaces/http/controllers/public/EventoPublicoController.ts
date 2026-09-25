import type { Request, Response } from 'express';
import type { EventoService } from '../../../../application/eventos/EventoService.js';
import { ConflictError } from '../../../../core/errors/DomainError.js';
import { camposDeError } from '../../support/errores.js';

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

/** IP del cliente: `CF-Connecting-IP` en Cloudflare, si no lo que resuelva Express (`X-Forwarded-For`/socket). */
const clientIp = (req: Request): string => {
  const cf = req.headers['cf-connecting-ip'];
  return (typeof cf === 'string' && cf) || req.ip || '';
};

/** Landing pública de eventos y formulario de registro. */
export class EventoPublicoController {
  constructor(
    private readonly eventos: EventoService,
    private readonly turnstileSiteKey: string,
  ) {}

  listar = async (_req: Request, res: Response): Promise<void> => {
    const eventos = (await this.eventos.listar(true)).filter((e) => e.abiertoARegistro);
    res.render('pages/public/eventos-list', { titulo: 'Próximos eventos', eventos });
  };

  detalle = async (req: Request, res: Response): Promise<void> => {
    const evento = await this.eventos.obtener(str(req.params.id));
    res.render('pages/public/evento', {
      titulo: evento.titulo,
      evento,
      turnstileSiteKey: this.turnstileSiteKey,
      navMinima: true,
      volverA: `/app/eventos/${evento.id}`,
      valores: {},
      errores: {},
      registrado: false,
    });
  };

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
        asistira: str(b.asistira),
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
