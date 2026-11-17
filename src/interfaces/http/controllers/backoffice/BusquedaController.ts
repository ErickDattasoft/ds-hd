import type { Request, Response } from 'express';
import type { BusquedaGlobalService } from '../../../../application/shared/BusquedaGlobalService.js';

const GRUPOS = [
  { tipo: 'empresa', titulo: '🏢 Empresas' },
  { tipo: 'contacto', titulo: '👤 Contactos' },
  { tipo: 'ticket', titulo: '🎫 Tickets' },
  { tipo: 'kb', titulo: '📚 Base de conocimiento' },
] as const;

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

/** Búsqueda global (Ctrl+K) del back-office. */
export class BusquedaController {
  constructor(private readonly busqueda: BusquedaGlobalService) {}

  buscar = async (req: Request, res: Response): Promise<void> => {
    const q = str(req.query.q);
    const resultados = await this.busqueda.buscar(req.user!, q);
    // Separados por apartado, con su nombre, para no confundir una empresa con un artículo.
    const grupos = GRUPOS.map((g) => ({ ...g, items: resultados.filter((r) => r.tipo === g.tipo) })).filter(
      (g) => g.items.length > 0,
    );
    res.render('partials/busqueda-resultados', {
      q,
      resultados,
      grupos,
      puedeKB: req.user!.permisos.includes('kb:leer'),
    });
  };
}
