import type { Request, Response } from 'express';
import type { KnowledgeService } from '../../../application/knowledge/KnowledgeService.js';
import type { VisibilidadKB } from '../../../core/entities/ArticuloKB.js';
import { renderMarkdown } from '../view-helpers/markdown.js';
import { camposDeError } from '../support/errores.js';

const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const lista = (v: unknown): string[] =>
  str(v)
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);

function contexto(req: Request) {
  return { esStaff: req.user?.esStaff ?? false, esCliente: req.user?.esCliente ?? false, anonimo: !req.user };
}

/**
 * Base de conocimiento. Sirve tres áreas con la misma lógica y distinta plantilla/contexto:
 *  - `/kb` público · `/portal/kb` clientes · `/app/kb` staff (+ CRUD).
 */
export class KnowledgeController {
  constructor(private readonly kb: KnowledgeService) {}

  private layoutDe(req: Request): string {
    if (req.baseUrl.startsWith('/app')) return 'layouts/backoffice.njk';
    if (req.baseUrl.startsWith('/portal')) return 'layouts/portal.njk';
    return 'layouts/public-page.njk';
  }

  private baseDe(req: Request): string {
    if (req.baseUrl.startsWith('/app')) return '/app/kb';
    if (req.baseUrl.startsWith('/portal')) return '/portal/kb';
    return '/kb';
  }

  listar = async (req: Request, res: Response): Promise<void> => {
    const texto = str(req.query.q);
    const articulos = await this.kb.listarVisibles(contexto(req), texto ? { texto } : {});
    res.render('pages/kb/list', {
      titulo: 'Base de conocimiento',
      articulos,
      q: texto,
      kbLayout: this.layoutDe(req),
      kbBase: this.baseDe(req),
    });
  };

  ver = async (req: Request, res: Response): Promise<void> => {
    const articulo = await this.kb.verVisible(contexto(req), str(req.params.idOrSlug));
    res.render('pages/kb/articulo', {
      titulo: articulo.titulo,
      articulo,
      cuerpoHtml: renderMarkdown(articulo.cuerpoMarkdown),
      kbLayout: this.layoutDe(req),
      kbBase: this.baseDe(req),
      puedeEditar: req.user?.permisos.includes('kb:escribir') ?? false,
    });
  };

  // ── CRUD (solo staff) ─────────────────────────────────────────────────────
  gestionar = async (_req: Request, res: Response): Promise<void> => {
    const articulos = await this.kb.listarVisibles({ esStaff: true, esCliente: false, anonimo: false });
    res.render('pages/backoffice/kb/gestion', { titulo: 'Gestionar base de conocimiento', articulos });
  };

  nuevo = (_req: Request, res: Response): void => {
    res.render('pages/backoffice/kb/form', { titulo: 'Nuevo artículo', modo: 'crear', valores: { visibilidad: 'staff' }, errores: {} });
  };

  editar = async (req: Request, res: Response): Promise<void> => {
    const articulo = await this.kb.obtenerParaEditar(req.user!, str(req.params.id));
    res.render('pages/backoffice/kb/form', {
      titulo: `Editar ${articulo.titulo}`,
      modo: 'editar',
      articulo,
      valores: { ...articulo, tags: articulo.tags.join(', ') },
      errores: {},
    });
  };

  guardarPost = async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id ? str(req.params.id) : undefined;
    const b = req.body ?? {};
    try {
      await this.kb.guardar(
        req.user!,
        {
          titulo: str(b.titulo),
          categoria: str(b.categoria),
          cuerpoMarkdown: str(b.cuerpoMarkdown),
          tags: lista(b.tags),
          publicado: b.publicado === 'on',
          visibilidad: (str(b.visibilidad) || 'staff') as VisibilidadKB,
        },
        id,
      );
      res.redirect('/app/kb');
    } catch (err) {
      res.status(422).render('pages/backoffice/kb/form', {
        titulo: id ? 'Editar artículo' : 'Nuevo artículo',
        modo: id ? 'editar' : 'crear',
        articulo: id ? { id } : null,
        valores: b,
        errores: camposDeError(err),
      });
    }
  };

  eliminarPost = async (req: Request, res: Response): Promise<void> => {
    await this.kb.eliminar(req.user!, str(req.params.id));
    res.redirect('/app/kb');
  };
}
