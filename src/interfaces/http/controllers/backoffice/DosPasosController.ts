import type { Request, Response } from 'express';
import type { DosPasosService } from '../../../../application/auth/DosPasosService.js';
import { DomainError } from '../../../../core/errors/DomainError.js';
import { invalidarCacheUsuario } from '../../middlewares/sessionAuth.js';

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

/** Activar / desactivar la verificación en dos pasos (Mi perfil) y quitarla a otro (admin). */
export class DosPasosController {
  constructor(private readonly dosPasos: DosPasosService) {}

  ver = async (req: Request, res: Response): Promise<void> => {
    if (req.user!.totpActivo) {
      res.render('pages/backoffice/dos-pasos', { titulo: 'Verificación en dos pasos', activa: true, errores: {} });
      return;
    }
    const { secreto, qrDataUrl } = await this.dosPasos.iniciar(req.user!);
    res.render('pages/backoffice/dos-pasos', {
      titulo: 'Verificación en dos pasos',
      activa: false,
      secreto: secreto.replace(/(.{4})/g, '$1 ').trim(),
      qrDataUrl,
      errores: {},
    });
  };

  activarPost = async (req: Request, res: Response): Promise<void> => {
    try {
      await this.dosPasos.activar(req.user!, str(req.body?.codigo));
      invalidarCacheUsuario(req.user!.uid);
      res.redirect('/app/mi-perfil?dosPasos=activada#dos-pasos');
    } catch (err) {
      if (!(err instanceof DomainError)) throw err;
      const { secreto, qrDataUrl } = await this.dosPasos.iniciar(req.user!);
      res.status(422).render('pages/backoffice/dos-pasos', {
        titulo: 'Verificación en dos pasos',
        activa: false,
        secreto: secreto.replace(/(.{4})/g, '$1 ').trim(),
        qrDataUrl,
        errores: { codigo: err.message },
      });
    }
  };

  desactivarPost = async (req: Request, res: Response): Promise<void> => {
    try {
      await this.dosPasos.desactivar(req.user!, str(req.body?.codigo));
      invalidarCacheUsuario(req.user!.uid);
      res.redirect('/app/mi-perfil?dosPasos=desactivada#dos-pasos');
    } catch (err) {
      if (!(err instanceof DomainError)) throw err;
      res.status(422).render('pages/backoffice/dos-pasos', {
        titulo: 'Verificación en dos pasos',
        activa: true,
        errores: { codigo: err.message },
      });
    }
  };

  quitarPost = async (req: Request, res: Response): Promise<void> => {
    const uid = str(req.params.uid);
    await this.dosPasos.resetear(req.user!, uid);
    invalidarCacheUsuario(uid);
    res.redirect(`/app/usuarios/${encodeURIComponent(uid)}`);
  };
}
