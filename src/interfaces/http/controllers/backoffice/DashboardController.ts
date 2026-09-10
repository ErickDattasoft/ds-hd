import type { Request, Response } from 'express';
import type { ObtenerMetricasService } from '../../../../application/dashboard/ObtenerMetricasService.js';
import type { AgendaService } from '../../../../application/dashboard/AgendaService.js';

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

/** Dashboard del back-office con métricas resumidas + calendario de agenda. */
export class DashboardController {
  constructor(
    private readonly metricas: ObtenerMetricasService,
    private readonly agenda: AgendaService,
  ) {}

  ver = async (req: Request, res: Response): Promise<void> => {
    const m = await this.metricas.ejecutar(req.user!);
    res.render('pages/backoffice/dashboard', { titulo: 'Dashboard', m });
  };

  calendario = async (req: Request, res: Response): Promise<void> => {
    const hoy = new Date();
    const m = /^(\d{4})-(\d{1,2})$/.exec(str(req.query.mes));
    const anio = m ? Number(m[1]) : hoy.getFullYear();
    const mes = m ? Math.min(11, Math.max(0, Number(m[2]) - 1)) : hoy.getMonth();
    res.render('pages/backoffice/agenda', {
      titulo: 'Calendario',
      cal: await this.agenda.mes(req.user!, anio, mes),
    });
  };
}
