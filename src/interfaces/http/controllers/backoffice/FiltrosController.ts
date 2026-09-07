import type { Request, Response } from 'express';
import type { FiltrosGuardadosService } from '../../../../application/shared/FiltrosGuardadosService.js';
import { camposDeError } from '../../support/errores.js';

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

/** Rutas comunes de filtros guardados (búsquedas frecuentes personales). */
export class FiltrosController {
  constructor(private readonly filtros: FiltrosGuardadosService) {}

  private volver(req: Request, res: Response, fallback: string): void {
    const v = str(req.body?.volver);
    res.redirect(v.startsWith('/app/') ? v : fallback);
  }

  guardarPost = async (req: Request, res: Response): Promise<void> => {
    const modulo = str(req.body?.modulo);
    try {
      await this.filtros.guardar(req.user!, {
        nombre: str(req.body?.nombre),
        modulo,
        query: str(req.body?.query),
      });
      this.volver(req, res, `/app/${modulo}`);
    } catch (err) {
      const msg = camposDeError(err).nombre ?? camposDeError(err).general ?? 'No se pudo guardar el filtro';
      this.volver(req, res, `/app/${modulo}?error=${encodeURIComponent(msg)}`);
    }
  };

  eliminarPost = async (req: Request, res: Response): Promise<void> => {
    await this.filtros.eliminar(req.user!, str(req.params.id));
    this.volver(req, res, '/app/empresas');
  };
}
