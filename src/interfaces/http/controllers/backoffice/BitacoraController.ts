import type { Request, Response } from 'express';
import type { BitacoraService } from '../../../../application/shared/BitacoraService.js';

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

/** Vista de solo lectura del registro de auditoría. */
export class BitacoraController {
  constructor(private readonly bitacora: BitacoraService) {}

  listar = async (req: Request, res: Response): Promise<void> => {
    const modulo = str(req.query.modulo);
    const entradas = await this.bitacora.listar({ ...(modulo ? { modulo } : {}), limite: 300 });
    res.render('pages/backoffice/bitacora/list', { titulo: 'Bitácora', entradas, modulo });
  };
}
