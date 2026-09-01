import type { Request, Response } from 'express';
import type { EventoService } from '../../../../application/eventos/EventoService.js';
import type { ILogger } from '../../../../core/ports/services/ILogger.js';

/**
 * Recibe webhooks de Brevo (entregado / rebotado). Protegido por `?key=`.
 * Actualiza `correoEstado` de la inscripción indicada por el tag `insc_<id>`.
 */
export class BrevoWebhookController {
  constructor(
    private readonly eventos: EventoService,
    private readonly secret: string,
    private readonly logger: ILogger,
  ) {}

  handle = async (req: Request, res: Response): Promise<void> => {
    if (!this.secret || req.query.key !== this.secret) {
      res.status(401).json({ error: 'no autorizado' });
      return;
    }
    const body = (req.body ?? {}) as { event?: string; email?: string; tag?: string; tags?: string[] };
    this.logger.info('Webhook Brevo recibido', { event: body.event, email: body.email });
    try {
      const r = await this.eventos.procesarWebhookBrevo(body);
      res.status(200).json({ ok: true, ...r });
    } catch (err) {
      this.logger.warn('Error procesando webhook Brevo', { err: err instanceof Error ? err.message : err });
      res.status(200).json({ ok: false });
    }
  };
}
