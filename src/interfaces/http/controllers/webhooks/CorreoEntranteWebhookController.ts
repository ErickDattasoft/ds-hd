import type { Request, Response } from 'express';
import type { CorreoEntranteService } from '../../../../application/tickets/CorreoEntranteService.js';
import type { ILogger } from '../../../../core/ports/services/ILogger.js';
import { correoDeCloudMailin } from '../../../../infrastructure/email/CloudMailinCorreo.js';

/**
 * Recibe los correos que reenvía CloudMailin (filtro de Zoho → CloudMailin → aquí). Protegido por
 * `?key=` (secreto `CORREO_ENTRANTE_SECRET` o la clave generada en Configuración → Correo entrante);
 * sin ninguna de las dos, el endpoint queda cerrado.
 */
export class CorreoEntranteWebhookController {
  constructor(
    private readonly service: CorreoEntranteService,
    private readonly logger: ILogger,
  ) {}

  handle = async (req: Request, res: Response): Promise<void> => {
    if (!(await this.service.claveWebhookValida(req.query.key))) {
      res.status(401).json({ ok: false, error: 'no autorizado' });
      return;
    }
    try {
      const correo = correoDeCloudMailin(req.body);
      const r = await this.service.recibirWebhook(correo);
      // Qué adjuntos trajo (sin el contenido): para saber por qué una imagen no aparece en el chat.
      const crudos = Array.isArray((req.body as { attachments?: unknown })?.attachments)
        ? ((req.body as { attachments: Array<Record<string, unknown>> }).attachments ?? [])
        : [];
      const adjuntos = crudos.map((a) => ({
        nombre: a?.file_name,
        tipo: a?.content_type,
        disposicion: a?.disposition,
        bytes: a?.size ?? (typeof a?.content === 'string' ? Math.floor((a.content.length * 3) / 4) : null),
        conContenido: typeof a?.content === 'string' && a.content.length > 0,
        conUrl: typeof a?.url === 'string',
      }));
      this.logger.info('Correo entrante (webhook)', {
        de: correo.de,
        asunto: correo.asunto,
        adjuntos,
        guardables: correo.adjuntos?.length ?? 0,
        ...r,
      });
      res.status(200).json({ ok: true, ...r });
    } catch (err) {
      // 500 → CloudMailin reintenta más tarde; el correo no se pierde.
      this.logger.error('Error procesando correo entrante', { err: err instanceof Error ? err.message : String(err) });
      res.status(500).json({ ok: false });
    }
  };
}
