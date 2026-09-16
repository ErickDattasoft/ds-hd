import type { Request, Response } from 'express';
import { MANUAL_STAFF_MD, MANUAL_USUARIO_FINAL_MD } from '../../../infrastructure/content/manualesGenerados.js';
import { renderMarkdown } from '../view-helpers/markdown.js';

/** Manual de uso dentro de la app (paridad con el CRM viejo) — staff ve el manual completo,
 * el portal de cliente ve la versión para usuario final. Contenido embebido en build time
 * (`docs:manuals`), no leído del filesystem: en Cloudflare Workers no hay filesystem. */
export class ManualController {
  ver = (req: Request, res: Response): void => {
    const esPortal = req.baseUrl.startsWith('/portal');
    res.render('pages/manual', {
      titulo: 'Manual de uso',
      manualHtml: renderMarkdown(esPortal ? MANUAL_USUARIO_FINAL_MD : MANUAL_STAFF_MD),
      manualLayout: esPortal ? 'layouts/portal.njk' : 'layouts/backoffice.njk',
    });
  };
}
