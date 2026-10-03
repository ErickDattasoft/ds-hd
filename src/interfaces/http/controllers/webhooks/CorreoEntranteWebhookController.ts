import type { Request, Response } from 'express';
import type { CorreoEntranteService } from '../../../../application/tickets/CorreoEntranteService.js';
import type { ILogger } from '../../../../core/ports/services/ILogger.js';
import { correoDeCloudMailin } from '../../../../infrastructure/email/CloudMailinCorreo.js';

/**
 * Recibe los correos que reenvía CloudMailin (filtro de Zoho → CloudMailin → aquí). Protegido por
 * `?key=` (secreto `CORREO_ENTRANTE_SECRET`); sin secreto configurado, el endpoint queda cerrado.
 */
export class CorreoEntranteWebhookController {
  constructor(
    private readonly service: CorreoEntranteService,
    private readonly secret: string,
    private readonly logger: ILogger,
  ) {}

  handle = async (req: Request, res: Response): Promise<void> => {
    if (!this.secret || req.query.key !== this.secret) {
      res.status(401).json({ ok: false, error: 'no autorizado' });
      return;
    }
    try {
      const correo = correoDeCloudMailin(req.body);
      const r = await this.service.recibirWebhook(correo);
      this.logger.info('Correo entrante (webhook)', { de: correo.de, asunto: correo.asunto, ...r });
      res.status(200).json({ ok: true, ...r });
    } catch (err) {
      // 500 → CloudMailin reintenta más tarde; el correo no se pierde.
      this.logger.error('Error procesando correo entrante', { err: err instanceof Error ? err.message : String(err) });
      res.status(500).json({ ok: false });
    }
  };
}
