import type { Request, Response } from 'express';
import type { ILogger } from '../../../../core/ports/services/ILogger.js';

/**
 * Recibe webhooks de Brevo (entregado / rebotado / abierto). Protegido por `?key=`.
 * Fase 2: solo registra el evento; la actualización de `correoEstado` por entidad llega
 * con el módulo de Eventos (Fase 4).
 */
export class BrevoWebhookController {
  constructor(
    private readonly secret: string,
    private readonly logger: ILogger,
  ) {}

  handle = (req: Request, res: Response): void => {
    if (!this.secret || req.query.key !== this.secret) {
      res.status(401).json({ error: 'no autorizado' });
      return;
    }
    this.logger.info('Webhook Brevo recibido', {
      event: (req.body as { event?: string })?.event,
      email: (req.body as { email?: string })?.email,
    });
    res.status(200).json({ ok: true });
  };
}
