import type { Request, Response } from 'express';
import { ReportesService, type Reporte } from '../../../../application/reportes/ReportesService.js';

const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const FECHA = /^\d{4}-\d{2}-\d{2}$/;
// Hora de negocio (Ciudad de México, sin horario de verano).
const inicioDia = (d: string) => new Date(`${d}T00:00:00-06:00`);
const finDia = (d: string) => new Date(`${d}T23:59:59.999-06:00`);
const ymd = (d: Date) => new Date(d.getTime() - 6 * 3_600_000).toISOString().slice(0, 10);

const SECCIONES: Record<string, { titulo: string; filas: (r: Reporte) => Reporte['porAgente'] }> = {
  agentes: { titulo: 'Agente', filas: (r) => r.porAgente },
  sistemas: { titulo: 'Sistema', filas: (r) => r.porSistema },
  empresas: { titulo: 'Empresa', filas: (r) => r.porEmpresa },
};

/** Reportes de desempeño del soporte (`/app/reportes`). */
export class ReportesController {
  constructor(private readonly reportes: ReportesService) {}

  private rango(req: Request): { desde: string; hasta: string } {
    const hoy = ymd(new Date());
    const desde = FECHA.test(str(req.query.desde)) ? str(req.query.desde) : `${hoy.slice(0, 8)}01`;
    const hasta = FECHA.test(str(req.query.hasta)) ? str(req.query.hasta) : hoy;
    return { desde, hasta };
  }

  ver = async (req: Request, res: Response): Promise<void> => {
    const { desde, hasta } = this.rango(req);
    const reporte = await this.reportes.generar(req.user!, inicioDia(desde), finDia(hasta));
    res.render('pages/backoffice/reportes', { titulo: 'Reportes', reporte, desde, hasta });
  };

  csv = async (req: Request, res: Response): Promise<void> => {
    const { desde, hasta } = this.rango(req);
    const seccion = SECCIONES[str(req.params.seccion)] ?? SECCIONES.agentes!;
    const reporte = await this.reportes.generar(req.user!, inicioDia(desde), finDia(hasta));
    res
      .type('text/csv; charset=utf-8')
      .attachment(`reporte-${str(req.params.seccion) || 'agentes'}-${desde}_${hasta}.csv`)
      .send(ReportesService.csv(seccion.titulo, seccion.filas(reporte)));
  };
}
