import type { Request, Response } from 'express';
import type { ArchivoLote, KnowledgeService } from '../../../application/knowledge/KnowledgeService.js';
import type { HistorialBusquedaKBService } from '../../../application/knowledge/HistorialBusquedaKBService.js';
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

/** Aplica categoría / tag / recientes / orden a una lista ya filtrada por visibilidad. */
function filtrarYOrdenar(
  articulos: ArticuloKB[],
  opts: { categoria: string; tag: string; desde: string; orden: string },
): ArticuloKB[] {
  let out = articulos;
  if (opts.categoria) out = out.filter((a) => (a.categoria ?? '') === opts.categoria);
  if (opts.tag) out = out.filter((a) => a.tags.includes(opts.tag));
  const corte = corteDesde(opts.desde);
  if (corte) out = out.filter((a) => a.updatedAt >= corte);
  const porTitulo = (a: ArticuloKB, b: ArticuloKB) => a.titulo.localeCompare(b.titulo, 'es');
  if (opts.orden === 'az') out = [...out].sort(porTitulo);
  else if (opts.orden === 'za') out = [...out].sort((a, b) => porTitulo(b, a));
  return out;
}

/** Nube de tags con conteo, del total de artículos visibles (no del subconjunto ya filtrado). */
function tagsDe(articulos: ArticuloKB[]): Array<{ nombre: string; total: number }> {
  const cuenta = new Map<string, number>();
  for (const a of articulos) {
    for (const t of a.tags) cuenta.set(t, (cuenta.get(t) ?? 0) + 1);
  }
  return [...cuenta.entries()]
    .map(([nombre, total]) => ({ nombre, total }))
    .sort((a, b) => b.total - a.total || a.nombre.localeCompare(b.nombre, 'es'))
    .slice(0, 40);
}

/**
 * Base de conocimiento. Sirve tres áreas con la misma lógica y distinta plantilla/contexto:
 *  - `/kb` público · `/portal/kb` clientes · `/app/kb` staff (+ CRUD).
 */
export class KnowledgeController {
  constructor(
    private readonly kb: KnowledgeService,
    private readonly historial: HistorialBusquedaKBService,
  ) {}

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
    const tag = str(req.query.tag);
    const desde = str(req.query.desde);
    const orden = str(req.query.orden);
    const fraseExacta = str(req.query.frase) === '1';
    const todos = await this.kb.listarVisibles(contexto(req), texto ? { texto, fraseExacta } : {});
    if (texto.length >= 2 && req.user) await this.historial.registrar(req.user, texto);
    res.render('pages/kb/list', {
      titulo: 'Base de conocimiento',
      articulos: filtrarYOrdenar(todos, { categoria, tag, desde, orden }),
      categorias: this.categoriasDe(todos),
      tags: tagsDe(todos),
      historial: req.user ? await this.historial.listar(req.user) : [],
      q: texto,
      categoria,
      tag,
      desde,
      orden,
      fraseExacta,
      kbLayout: this.layoutDe(req),
      kbBase: this.baseDe(req),
    });
  };

  historialLimpiarPost = async (req: Request, res: Response): Promise<void> => {
    await this.historial.limpiar(req.user!);
    res.redirect(this.baseDe(req));
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
    const ctx = contexto(req);
    const articulo = await this.kb.verVisible(ctx, str(req.params.idOrSlug));
    res.render('pages/kb/articulo', {
      titulo: articulo.titulo,
      articulo,
      cuerpoHtml: renderMarkdown(articulo.cuerpoMarkdown),
      relacionados: await this.kb.relacionados(ctx, articulo),
      kbLayout: this.layoutDe(req),
      kbBase: this.baseDe(req),
      puedeEditar: req.user?.permisos.includes('kb:escribir') ?? false,
    });
  };

  /** Vista dividida: dos artículos lado a lado (`?a=idOrSlug&b=idOrSlug`). */
  comparar = async (req: Request, res: Response): Promise<void> => {
    const ctx = contexto(req);
    const idA = str(req.query.a);
    const idB = str(req.query.b);
    if (!idA) {
      res.redirect(this.baseDe(req));
      return;
    }
    const articuloA = await this.kb.verVisible(ctx, idA);
    const articuloB = idB ? await this.kb.verVisible(ctx, idB) : null;
    const todos = await this.kb.listarVisibles(ctx);
    res.render('pages/kb/comparar', {
      titulo: articuloB ? `${articuloA.titulo} · ${articuloB.titulo}` : `Comparar: ${articuloA.titulo}`,
      articuloA,
      articuloB,
      cuerpoHtmlA: renderMarkdown(articuloA.cuerpoMarkdown),
      cuerpoHtmlB: articuloB ? renderMarkdown(articuloB.cuerpoMarkdown) : null,
      otros: todos.filter((a) => a.id !== articuloA.id && a.id !== articuloB?.id),
      kbLayout: this.layoutDe(req),
      kbBase: this.baseDe(req),
    });
  };

  // ── CRUD (solo staff) ─────────────────────────────────────────────────────
  gestionar = async (req: Request, res: Response): Promise<void> => {
    const ctx = { esStaff: true, esCliente: false, anonimo: false };
    const categoria = str(req.query.categoria);
    const tag = str(req.query.tag);
    const desde = str(req.query.desde);
    const orden = str(req.query.orden) || 'recientes';
    const todos = await this.kb.listarVisibles(ctx);
    res.render('pages/backoffice/kb/gestion', {
      titulo: 'Gestionar base de conocimiento',
      articulos: filtrarYOrdenar(todos, { categoria, tag, desde, orden }),
      categorias: this.categoriasDe(todos),
      tags: tagsDe(todos),
      categoria,
      tag,
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
