import type { Request, Response } from 'express';
import type { ArchivoLote, KnowledgeService } from '../../../application/knowledge/KnowledgeService.js';
import type { ArticuloKB, VisibilidadKB } from '../../../core/entities/ArticuloKB.js';
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

/** Traduce `hoy` / `semana` a una fecha de corte (o `null`). */
function corteDesde(valor: string): Date | null {
  const ahora = new Date();
  if (valor === 'hoy') return new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  if (valor === 'semana') return new Date(ahora.getTime() - 7 * 86_400_000);
  return null;
}

/** Aplica categoría / recientes / orden a una lista ya filtrada por visibilidad. */
function filtrarYOrdenar(
  articulos: ArticuloKB[],
  opts: { categoria: string; desde: string; orden: string },
): ArticuloKB[] {
  let out = articulos;
  if (opts.categoria) out = out.filter((a) => (a.categoria ?? '') === opts.categoria);
  const corte = corteDesde(opts.desde);
  if (corte) out = out.filter((a) => a.updatedAt >= corte);
  const porTitulo = (a: ArticuloKB, b: ArticuloKB) => a.titulo.localeCompare(b.titulo, 'es');
  if (opts.orden === 'az') out = [...out].sort(porTitulo);
  else if (opts.orden === 'za') out = [...out].sort((a, b) => porTitulo(b, a));
  return out;
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
    const categoria = str(req.query.categoria);
    const desde = str(req.query.desde);
    const orden = str(req.query.orden);
    const todos = await this.kb.listarVisibles(contexto(req), texto ? { texto } : {});
    res.render('pages/kb/list', {
      titulo: 'Base de conocimiento',
      articulos: filtrarYOrdenar(todos, { categoria, desde, orden }),
      categorias: this.categoriasDe(todos),
      q: texto,
      categoria,
      desde,
      orden,
      kbLayout: this.layoutDe(req),
      kbBase: this.baseDe(req),
    });
  };

  private categoriasDe(articulos: ArticuloKB[]): Array<{ nombre: string; total: number }> {
    const cuenta = new Map<string, number>();
    for (const a of articulos) {
      const c = a.categoria ?? '';
      if (c) cuenta.set(c, (cuenta.get(c) ?? 0) + 1);
    }
    return [...cuenta.entries()]
      .map(([nombre, total]) => ({ nombre, total }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }

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
  gestionar = async (req: Request, res: Response): Promise<void> => {
    const ctx = { esStaff: true, esCliente: false, anonimo: false };
    const categoria = str(req.query.categoria);
    const desde = str(req.query.desde);
    const orden = str(req.query.orden) || 'recientes';
    const todos = await this.kb.listarVisibles(ctx);
    res.render('pages/backoffice/kb/gestion', {
      titulo: 'Gestionar base de conocimiento',
      articulos: filtrarYOrdenar(todos, { categoria, desde, orden }),
      categorias: this.categoriasDe(todos),
      categoria,
      desde,
      orden,
      aviso: str(req.query.aviso) || null,
    });
  };

  subirView = (_req: Request, res: Response): void => {
    res.render('pages/backoffice/kb/subir', { titulo: 'Subir archivos a la base de conocimiento', errores: {} });
  };

  /** El navegador manda los archivos ya leídos como JSON (`[{nombre, contenido, rutaRelativa}]`). */
  subirPost = async (req: Request, res: Response): Promise<void> => {
    const b = req.body ?? {};
    const archivos: ArchivoLote[] = Array.isArray(b.archivos)
      ? b.archivos.map((a: Record<string, unknown>) => ({
          nombre: str(a.nombre),
          contenido: str(a.contenido),
          rutaRelativa: str(a.rutaRelativa) || undefined,
        }))
      : [];
    try {
      const creados = await this.kb.crearLote(req.user!, archivos, {
        visibilidad: (str(b.visibilidad) || 'staff') as VisibilidadKB,
        publicado: b.publicado === 'on' || b.publicado === true,
      });
      res.json({ ok: true, creados: creados.length });
    } catch (err) {
      res.status(422).json({ ok: false, error: camposDeError(err).archivos ?? camposDeError(err).general ?? 'No se pudo importar' });
    }
  };

  exportJson = async (req: Request, res: Response): Promise<void> => {
    const ctx = contexto(req);
    const categoria = str(req.query.categoria);
    const desde = corteDesde(str(req.query.desde));
    let articulos = await this.kb.listarVisibles(ctx, categoria ? { categoria } : {});
    if (desde) articulos = articulos.filter((a) => a.updatedAt >= desde);
    const fecha = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Disposition', `attachment; filename="kb-${fecha}.json"`);
    res.type('application/json').send(
      JSON.stringify(
        articulos.map((a) => ({
          titulo: a.titulo,
          slug: a.slug,
          categoria: a.categoria,
          tags: a.tags,
          rutaDestino: a.rutaDestino,
          visibilidad: a.visibilidad,
          publicado: a.publicado,
          cuerpoMarkdown: a.cuerpoMarkdown,
          actualizado: a.updatedAt.toISOString(),
        })),
        null,
        2,
      ),
    );
  };

  exportZip = async (req: Request, res: Response): Promise<void> => {
    const categoria = str(req.query.categoria);
    const desde = corteDesde(str(req.query.desde));
    const buffer = await this.kb.exportarZip(contexto(req), {
      ...(categoria ? { categoria } : {}),
      ...(desde ? { desde } : {}),
    });
    const fecha = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Disposition', `attachment; filename="kb-${fecha}.zip"`);
    res.type('application/zip').send(buffer);
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
          rutaDestino: str(b.rutaDestino),
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
