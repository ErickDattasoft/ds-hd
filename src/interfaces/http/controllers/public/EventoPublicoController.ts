import type { Request, Response } from 'express';
import type { EventoService } from '../../../../application/eventos/EventoService.js';
import { camposDeError } from '../../support/errores.js';

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

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
      valores: {},
      errores: {},
      registrado: false,
    });
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
        captchaToken: str(b['cf-turnstile-response']),
        ip: req.ip,
      });
      const evento = await this.eventos.obtener(id);
      res.render('pages/public/evento', {
        titulo: evento.titulo,
        evento,
        turnstileSiteKey: this.turnstileSiteKey,
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
        valores: b,
        errores: camposDeError(err),
        registrado: false,
      });
    }
  };
}
