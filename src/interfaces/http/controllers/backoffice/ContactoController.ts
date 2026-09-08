import type { Request, Response } from 'express';
import type { ContactoService } from '../../../../application/contactos/ContactoService.js';
import type { ContactoExcelService } from '../../../../application/contactos/ContactoExcelService.js';
import type { EmpresaService } from '../../../../application/empresas/EmpresaService.js';
import { camposDeError } from '../../support/errores.js';

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

/** CRUD de contactos. */
export class ContactoController {
  constructor(
    private readonly contactos: ContactoService,
    private readonly empresas: EmpresaService,
    private readonly excel: ContactoExcelService,
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
      let empresaId = str(b.empresaId);
      // "Crear empresa" inline: si se escribió un nombre de empresa nueva y no se eligió una existente.
      if (!empresaId && str(b.empresaNueva).trim()) {
        const emp = await this.empresas.crear(req.user!, { nombre: str(b.empresaNueva).trim() });
        empresaId = emp.id;
      }
      const c = await this.contactos.crear(req.user!, { ...this.datos(b), empresaId });
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

  exportarExcel = async (req: Request, res: Response): Promise<void> => {
    const texto = str(req.query.q);
    const empresaId = str(req.query.empresa);
    const buffer = await this.excel.exportar({
      activo: true,
      ...(texto ? { texto } : {}),
      ...(empresaId ? { empresaId } : {}),
    });
    const fecha = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Disposition', `attachment; filename="contactos-${fecha}.xlsx"`);
    res.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet').send(buffer);
  };

  importarView = (_req: Request, res: Response): void => {
    res.render('pages/backoffice/contactos/importar', { titulo: 'Importar contactos' });
  };

  /** El archivo llega por `fetch` con `FormData` (CSRF vía cabecera `x-csrf-token`, no campo de
   * formulario — el body multipart aún no está parseado cuando corre el chequeo global de CSRF). */
  importarPost = async (req: Request, res: Response): Promise<void> => {
    const archivo = req.file;
    if (!archivo) {
      res.status(422).json({ ok: false, error: 'Selecciona un archivo .xlsx' });
      return;
    }
    try {
      const resultado = await this.excel.importar(req.user!, archivo.buffer);
      res.json({ ok: true, resultado });
    } catch (err) {
      res.status(422).json({ ok: false, error: err instanceof Error ? err.message : 'No se pudo importar el archivo' });
    }
  };

  private datos(b: Record<string, unknown>) {
    return {
      nombre: str(b.nombre),
      empresaId: str(b.empresaId),
      puesto: str(b.puesto),
      rfc: str(b.rfc),
      email: str(b.email),
      telefono: str(b.telefono),
      celular: str(b.celular),
      notas: str(b.notas),
    };
  }
}
