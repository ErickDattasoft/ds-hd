import type { Request, Response } from 'express';
import type { ContactoService } from '../../../../application/contactos/ContactoService.js';
import type { EmpresaService } from '../../../../application/empresas/EmpresaService.js';
import { camposDeError } from '../../support/errores.js';

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

/** CRUD de contactos. */
export class ContactoController {
  constructor(
    private readonly contactos: ContactoService,
    private readonly empresas: EmpresaService,
  ) {}

  listar = async (req: Request, res: Response): Promise<void> => {
    const texto = str(req.query.q);
    const empresaId = str(req.query.empresa);
    const contactos = await this.contactos.listar({
      activo: true,
      ...(texto ? { texto } : {}),
      ...(empresaId ? { empresaId } : {}),
    });
    const empresas = await this.empresas.listar({ activa: true });
    const nombreEmpresa = Object.fromEntries(empresas.map((e) => [e.id, e.nombre]));
    res.render('pages/backoffice/contactos/list', {
      titulo: 'Contactos',
      contactos,
      empresas,
      nombreEmpresa,
      q: texto,
      empresaId,
    });
  };

  nuevo = async (req: Request, res: Response): Promise<void> => {
    const empresas = await this.empresas.listar({ activa: true });
    res.render('pages/backoffice/contactos/form', {
      titulo: 'Nuevo contacto',
      modo: 'crear',
      empresas,
      valores: { empresaId: str(req.query.empresa) },
      errores: {},
    });
  };

  crearPost = async (req: Request, res: Response): Promise<void> => {
    const b = req.body ?? {};
    try {
      const c = await this.contactos.crear(req.user!, this.datos(b));
      res.redirect(`/app/empresas/${c.empresaId}`);
    } catch (err) {
      const empresas = await this.empresas.listar({ activa: true });
      res.status(422).render('pages/backoffice/contactos/form', {
        titulo: 'Nuevo contacto',
        modo: 'crear',
        empresas,
        valores: b,
        errores: camposDeError(err),
      });
    }
  };

  editar = async (req: Request, res: Response): Promise<void> => {
    const contacto = await this.contactos.obtener(str(req.params.id));
    const empresas = await this.empresas.listar({ activa: true });
    res.render('pages/backoffice/contactos/form', {
      titulo: `Editar ${contacto.nombre}`,
      modo: 'editar',
      contacto,
      empresas,
      valores: contacto,
      errores: {},
    });
  };

  actualizarPost = async (req: Request, res: Response): Promise<void> => {
    const id = str(req.params.id);
    const b = req.body ?? {};
    try {
      const c = await this.contactos.actualizar(req.user!, id, this.datos(b));
      res.redirect(`/app/empresas/${c.empresaId}`);
    } catch (err) {
      const empresas = await this.empresas.listar({ activa: true });
      res.status(422).render('pages/backoffice/contactos/form', {
        titulo: 'Editar contacto',
        modo: 'editar',
        empresas,
        valores: { id, ...b },
        errores: camposDeError(err),
      });
    }
  };

  archivarPost = async (req: Request, res: Response): Promise<void> => {
    await this.contactos.archivar(req.user!, str(req.params.id), req.body?.archivar !== 'false');
    res.redirect('/app/contactos');
  };

  private datos(b: Record<string, unknown>) {
    return {
      nombre: str(b.nombre),
      empresaId: str(b.empresaId),
      puesto: str(b.puesto),
      email: str(b.email),
      telefono: str(b.telefono),
      celular: str(b.celular),
      notas: str(b.notas),
    };
  }
}
