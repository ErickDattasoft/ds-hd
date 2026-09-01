import type { Request, Response } from 'express';
import type { ObtenerMetricasService } from '../../../../application/dashboard/ObtenerMetricasService.js';

/** Dashboard del back-office con métricas resumidas. */
export class DashboardController {
  constructor(private readonly metricas: ObtenerMetricasService) {}

  ver = async (req: Request, res: Response): Promise<void> => {
    const m = await this.metricas.ejecutar(req.user!);
    res.render('pages/backoffice/dashboard', { titulo: 'Dashboard', m });
  };
}
