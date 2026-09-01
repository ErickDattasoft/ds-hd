import type { Request, Response } from 'express';
import type { CrearTicketPublicoService } from '../../../../application/tickets/CrearTicketPublicoService.js';
import type { IConfiguracionRepository } from '../../../../core/ports/repositories/IConfiguracionRepository.js';
import { camposDeError } from '../../support/errores.js';

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

/** Formulario público de tickets (sin cuenta). */
export class TicketPublicoController {
  constructor(
    private readonly crear: CrearTicketPublicoService,
    private readonly config: IConfiguracionRepository,
    private readonly turnstileSiteKey: string,
  ) {}

  form = async (_req: Request, res: Response): Promise<void> => {
    const cfg = await this.config.obtenerTickets();
    res.render('pages/public/ticket-publico', {
      titulo: 'Levantar un ticket',
      tipos: cfg.tipos,
      sistemas: cfg.sistemas,
      prioridades: cfg.prioridades,
      turnstileSiteKey: this.turnstileSiteKey,
      valores: {},
      errores: {},
    });
  };

  crearPost = async (req: Request, res: Response): Promise<void> => {
    const b = req.body ?? {};
    try {
      const creado = await this.crear.ejecutar({
        nombre: str(b.nombre),
        empresa: str(b.empresa),
        correo: str(b.correo),
        telefono: str(b.telefono),
        asunto: str(b.asunto),
        sistema: str(b.sistema),
        tipo: str(b.tipo),
        prioridad: str(b.prioridad),
        descripcion: str(b.descripcion),
        captchaToken: str(b['cf-turnstile-response']),
        ip: req.ip,
      });
      res.render('pages/public/ticket-publico-ok', { titulo: 'Solicitud recibida', folio: creado.folio });
    } catch (err) {
      const cfg = await this.config.obtenerTickets();
      res.status(422).render('pages/public/ticket-publico', {
        titulo: 'Levantar un ticket',
        tipos: cfg.tipos,
        sistemas: cfg.sistemas,
        prioridades: cfg.prioridades,
        turnstileSiteKey: this.turnstileSiteKey,
        valores: b,
        errores: camposDeError(err),
      });
    }
  };
}
