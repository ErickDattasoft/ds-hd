import type { Request, Response } from 'express';
import type { EmpresaService } from '../../../../application/empresas/EmpresaService.js';
import type { ContactoService } from '../../../../application/contactos/ContactoService.js';
import type { ITicketQueries } from '../../../../core/ports/repositories/ITicketQueries.js';
import { camposDeError } from '../../support/errores.js';

const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const lista = (v: unknown): string[] =>
  str(v)
    .split(/\r?\n|,/)
    .map((s) => s.trim())
    .filter(Boolean);

/** CRUD de empresas. */
export class EmpresaController {
  constructor(
    private readonly empresas: EmpresaService,
    private readonly contactos: ContactoService,
    private readonly ticketQueries: ITicketQueries,
  ) {}

  listar = async (req: Request, res: Response): Promise<void> => {
    const texto = str(req.query.q);
    const incluirArchivadas = req.query.archivadas === '1';
    const empresas = await this.empresas.listar({
      ...(texto ? { texto } : {}),
      ...(incluirArchivadas ? {} : { activa: true }),
    });
    res.render('pages/backoffice/empresas/list', { titulo: 'Empresas', empresas, q: texto, incluirArchivadas });
  };

  nuevo = (_req: Request, res: Response): void => {
    res.render('pages/backoffice/empresas/form', { titulo: 'Nueva empresa', modo: 'crear', valores: {}, errores: {} });
  };

  crearPost = async (req: Request, res: Response): Promise<void> => {
    const b = req.body ?? {};
    try {
      const e = await this.empresas.crear(req.user!, this.datos(b));
      res.redirect(`/app/empresas/${e.id}`);
    } catch (err) {
      res.status(422).render('pages/backoffice/empresas/form', {
        titulo: 'Nueva empresa',
        modo: 'crear',
        valores: b,
        errores: camposDeError(err),
      });
    }
  };

  ver = async (req: Request, res: Response): Promise<void> => {
    const id = str(req.params.id);
    const empresa = await this.empresas.obtener(id);
    const [contactos, tickets] = await Promise.all([
      this.contactos.listar({ empresaId: id }),
      this.ticketQueries.listar({ empresaId: id, limite: 20 }),
    ]);
    res.render('pages/backoffice/empresas/detail', { titulo: empresa.nombre, empresa, contactos, tickets });
  };

  editar = async (req: Request, res: Response): Promise<void> => {
    const empresa = await this.empresas.obtener(str(req.params.id));
    res.render('pages/backoffice/empresas/form', {
      titulo: `Editar ${empresa.nombre}`,
      modo: 'editar',
      empresa,
      valores: { ...empresa, sistemasContratados: empresa.sistemasContratados.join('\n') },
      errores: {},
    });
  };

  actualizarPost = async (req: Request, res: Response): Promise<void> => {
    const id = str(req.params.id);
    const b = req.body ?? {};
    try {
      await this.empresas.actualizar(req.user!, id, this.datos(b));
      res.redirect(`/app/empresas/${id}`);
    } catch (err) {
      const empresa = await this.empresas.obtener(id).catch(() => null);
      res.status(422).render('pages/backoffice/empresas/form', {
        titulo: 'Editar empresa',
        modo: 'editar',
        empresa,
        valores: b,
        errores: camposDeError(err),
      });
    }
  };

  archivarPost = async (req: Request, res: Response): Promise<void> => {
    await this.empresas.archivar(req.user!, str(req.params.id), req.body?.archivar !== 'false');
    res.redirect('/app/empresas');
  };

  private datos(b: Record<string, unknown>) {
    return {
      nombre: str(b.nombre),
      rfc: str(b.rfc),
      razonSocial: str(b.razonSocial),
      direccion: str(b.direccion),
      telefono: str(b.telefono),
      email: str(b.email),
      sistemasContratados: lista(b.sistemasContratados),
      notas: str(b.notas),
    };
  }
}
