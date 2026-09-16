import type { Request, Response } from 'express';
import type { PizarraKBService } from '../../../application/knowledge/PizarraKBService.js';
import { camposDeError } from '../support/errores.js';

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

/** Pizarra temporal (bloc de notas personal con autoguardado) — staff y portal de cliente. */
export class PizarraKBController {
  constructor(private readonly pizarra: PizarraKBService) {}

  private layoutDe(req: Request): string {
    return req.baseUrl.startsWith('/portal') ? 'layouts/portal.njk' : 'layouts/backoffice.njk';
  }

  private baseDe(req: Request): string {
    return req.baseUrl.startsWith('/portal') ? '/portal/kb' : '/app/kb';
  }

  ver = async (req: Request, res: Response): Promise<void> => {
    const contenido = await this.pizarra.obtener(req.user!);
    res.render('pages/kb/pizarra', {
      titulo: 'Pizarra',
      contenido,
      kbLayout: this.layoutDe(req),
      kbBase: this.baseDe(req),
    });
  };

  guardarJson = async (req: Request, res: Response): Promise<void> => {
    try {
      const actualizadoEn = await this.pizarra.guardar(req.user!, str(req.body?.contenido));
      res.json({ ok: true, actualizadoEn: actualizadoEn.toISOString() });
    } catch (err) {
      res.status(422).json({ ok: false, error: camposDeError(err).contenido ?? camposDeError(err).general ?? 'No se pudo guardar' });
    }
  };
}
