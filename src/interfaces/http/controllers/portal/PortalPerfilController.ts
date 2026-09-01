import type { Request, Response } from 'express';
import type { ActualizarMiPerfilService } from '../../../../application/portal/ActualizarMiPerfilService.js';
import type { IUsuarioRepository } from '../../../../core/ports/repositories/IUsuarioRepository.js';
import { DomainError } from '../../../../core/errors/DomainError.js';
import { invalidarCacheUsuario } from '../../middlewares/sessionAuth.js';

/** El cliente ve y edita su propio perfil (solo nombre). */
export class PortalPerfilController {
  constructor(
    private readonly usuarios: IUsuarioRepository,
    private readonly actualizar: ActualizarMiPerfilService,
  ) {}

  ver = async (req: Request, res: Response): Promise<void> => {
    const usuario = await this.usuarios.findByUid(req.user!.uid);
    res.render('pages/portal/perfil', {
      titulo: 'Mi perfil',
      usuario,
      valores: { nombre: usuario?.nombre ?? '' },
      errores: {},
      guardado: false,
    });
  };

  actualizar_ = async (req: Request, res: Response): Promise<void> => {
    const nombre = String(req.body?.nombre ?? '');
    try {
      await this.actualizar.ejecutar({ actor: req.user!, nombre });
      invalidarCacheUsuario(req.user!.uid);
      const usuario = await this.usuarios.findByUid(req.user!.uid);
      res.render('pages/portal/perfil', {
        titulo: 'Mi perfil',
        usuario,
        valores: { nombre },
        errores: {},
        guardado: true,
      });
    } catch (err) {
      const errores =
        err instanceof DomainError && 'campos' in err
          ? (err.campos as Record<string, string>)
          : { general: 'No se pudo guardar' };
      res.status(422).render('pages/portal/perfil', {
        titulo: 'Mi perfil',
        valores: { nombre },
        errores,
        guardado: false,
      });
    }
  };
}
