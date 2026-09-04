import type { Request, Response } from 'express';
import type { VersionService } from '../../../../application/versiones/VersionService.js';
import type { IConfiguracionRepository } from '../../../../core/ports/repositories/IConfiguracionRepository.js';
import type { ContactoSoporte } from '../../../../core/entities/ConfiguracionAvisos.js';
import { camposDeError } from '../../support/errores.js';

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

/** Un contacto de soporte por línea, formato `Nombre: Teléfono`. */
function contactosDeTexto(texto: string): ContactoSoporte[] {
  return texto
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const i = l.indexOf(':');
      return i === -1
        ? { nombre: l, telefono: '' }
        : { nombre: l.slice(0, i).trim(), telefono: l.slice(i + 1).trim() };
    });
}

/** Serializa contactos de soporte de vuelta a `Nombre: Teléfono` por línea, para el textarea. */
function contactosATexto(contactos: ContactoSoporte[]): string {
  return contactos.map((c) => (c.telefono ? `${c.nombre}: ${c.telefono}` : c.nombre)).join('\n');
}

/** Catálogo de versiones de sistemas. */
export class VersionController {
  constructor(
    private readonly versiones: VersionService,
    private readonly configuracion: IConfiguracionRepository,
  ) {}

  private async renderAvisos(res: Response, guardado: boolean): Promise<void> {
    const config = await this.configuracion.obtenerAvisos();
    res.render('pages/backoffice/versiones/avisos', {
      titulo: 'Avisos de versiones y licencias',
      config,
      contactosVersionesTexto: contactosATexto(config.contactosSoporteVersiones),
      contactosLicenciasTexto: contactosATexto(config.contactosSoporteLicencias),
      guardado,
    });
  }

  avisosView = async (_req: Request, res: Response): Promise<void> => {
    await this.renderAvisos(res, false);
  };

  avisosPost = async (req: Request, res: Response): Promise<void> => {
    const b = req.body ?? {};
    await this.configuracion.guardarAvisos({
      plantillaVersiones: str(b.plantillaVersiones),
      plantillaLicencias: str(b.plantillaLicencias),
      contactosSoporteVersiones: contactosDeTexto(str(b.contactosSoporteVersiones)),
      contactosSoporteLicencias: contactosDeTexto(str(b.contactosSoporteLicencias)),
    });
    await this.renderAvisos(res, true);
  };

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
