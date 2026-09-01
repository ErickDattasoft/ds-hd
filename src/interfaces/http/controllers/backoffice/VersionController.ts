import type { Request, Response } from 'express';
import type { VersionService } from '../../../../application/versiones/VersionService.js';
import { camposDeError } from '../../support/errores.js';

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

/** Catálogo de versiones de sistemas. */
export class VersionController {
  constructor(private readonly versiones: VersionService) {}

  listar = async (_req: Request, res: Response): Promise<void> => {
    const versiones = await this.versiones.listar();
    res.render('pages/backoffice/versiones/list', { titulo: 'Versiones de sistemas', versiones });
  };

  nuevo = (_req: Request, res: Response): void => {
    res.render('pages/backoffice/versiones/form', { titulo: 'Nueva versión', modo: 'crear', valores: {}, errores: {} });
  };

  editar = async (req: Request, res: Response): Promise<void> => {
    const version = await this.versiones.obtener(str(req.params.id));
    res.render('pages/backoffice/versiones/form', {
      titulo: `Editar ${version.sistema}`,
      modo: 'editar',
      version,
      valores: version,
      errores: {},
    });
  };

  guardarPost = async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id ? str(req.params.id) : undefined;
    const b = req.body ?? {};
    try {
      await this.versiones.guardar(
        req.user!,
        {
          sistema: str(b.sistema),
          versionActual: str(b.versionActual),
          fechaLiberacion: str(b.fechaLiberacion),
          notasVersion: str(b.notasVersion),
          linkDescarga: str(b.linkDescarga),
        },
        id,
      );
      res.redirect('/app/versiones');
    } catch (err) {
      res.status(422).render('pages/backoffice/versiones/form', {
        titulo: id ? 'Editar versión' : 'Nueva versión',
        modo: id ? 'editar' : 'crear',
        version: id ? { id } : null,
        valores: b,
        errores: camposDeError(err),
      });
    }
  };

  eliminarPost = async (req: Request, res: Response): Promise<void> => {
    await this.versiones.eliminar(req.user!, str(req.params.id));
    res.redirect('/app/versiones');
  };
}
