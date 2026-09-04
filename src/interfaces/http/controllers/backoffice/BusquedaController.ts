import type { Request, Response } from 'express';
import type { BusquedaGlobalService } from '../../../../application/shared/BusquedaGlobalService.js';

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

/** Búsqueda global (Ctrl+K) del back-office. */
export class BusquedaController {
  constructor(private readonly busqueda: BusquedaGlobalService) {}

  buscar = async (req: Request, res: Response): Promise<void> => {
    const q = str(req.query.q);
    const resultados = await this.busqueda.buscar(req.user!, q);
    res.render('partials/busqueda-resultados', { q, resultados });
  };
}
