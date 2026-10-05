import type { Request, Response } from 'express';
import type { ArchivoIndexado, KnowledgeService } from '../../../application/knowledge/KnowledgeService.js';
import type { AccesoKBService } from '../../../application/knowledge/AccesoKBService.js';
import type { HistorialBusquedaKBService } from '../../../application/knowledge/HistorialBusquedaKBService.js';
import {
  CARPETAS_KB,
  CARPETA_KB_ETIQUETA,
  esCarpetaKB,
  fragmentoKB,
  type ArticuloKB,
} from '../../../core/entities/ArticuloKB.js';
import { ValidationError } from '../../../core/errors/DomainError.js';
import { renderMarkdown } from '../view-helpers/markdown.js';
import { invalidarCacheAccesoKB } from '../middlewares/sessionAuth.js';

const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const arreglo = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : typeof v === 'string' && v ? [v] : []);

/** Traduce `hoy` / `semana` / fecha ISO a una fecha de corte (o `null`). */
function corteDesde(valor: string): Date | null {
  const ahora = new Date();
  if (valor === 'hoy') return new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  if (valor === 'semana') return new Date(ahora.getTime() - 7 * 86_400_000);
  // «Desde mi última exportación»: el navegador manda la fecha (la guarda al exportar).
  if (/^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(valor)) {
    const d = new Date(valor);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/** Minúsculas y sin acentos (para puntuar la relevancia igual que busca el repositorio). */
const plano = (t: string): string => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Relevancia: nombre del archivo > ruta (empresa/subcarpeta) > solo contenido. */
function relevancia(a: ArticuloKB, q: string): number {
  const t = plano(q.trim());
  const palabras = t.split(/\s+/).filter(Boolean);
  const titulo = plano(a.titulo);
  const ruta = plano(a.rutaDestino ?? '');
  if (titulo.includes(t)) return 4;
  if (palabras.every((p) => titulo.includes(p))) return 3;
  if (ruta.includes(t) || palabras.every((p) => ruta.includes(p) || titulo.includes(p))) return 2;
  return 1;
}

const porTitulo = (a: ArticuloKB, b: ArticuloKB) =>
  a.titulo.localeCompare(b.titulo, 'es', { numeric: true, sensitivity: 'base' });

function ordenar(articulos: ArticuloKB[], orden: string, q: string): ArticuloKB[] {
  const out = [...articulos];
  if (orden === 'za') return out.sort((a, b) => porTitulo(b, a));
  if (orden === 'recientes') return out.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  if (orden === 'az' || !q) return out.sort(porTitulo);
  return out.sort((a, b) => relevancia(b, q) - relevancia(a, q) || porTitulo(a, b));
}

/** Contenido del artículo como HTML: Markdown si es `.md`; si no (scripts, .txt), tal cual. */
function cuerpoHtml(a: ArticuloKB): string {
  if (a.esMarkdown) return renderMarkdown(a.cuerpoMarkdown);
  const escapado = a.cuerpoMarkdown.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<pre class="kb-texto"><code>${escapado}</code></pre>`;
}

/** Máximo de filas que se pintan a la vez (con cientos de archivos la tabla se vuelve lenta). */
const MAX_FILAS = 300;

/**
 * Base de conocimiento (`/app/kb`). De solo lectura: se busca, se ve y se copia. El contenido
 * entra únicamente con «🔄 Indexar» desde las carpetas de Windows, y eso — igual que borrar,
 * exportar y el panel «👥 Acceso» — es solo del propietario (`kb:escribir` / `kb:publicar`).
 */
export class KnowledgeController {
  constructor(
    private readonly kb: KnowledgeService,
    private readonly historial: HistorialBusquedaKBService,
    private readonly acceso: AccesoKBService,
  ) {}

  listar = async (req: Request, res: Response): Promise<void> => {
    const user = req.user!;
    const carpetaQ = str(req.query.carpeta);
    const carpeta = esCarpetaKB(carpetaQ) ? carpetaQ : '';
    const sub = str(req.query.sub);
    const q = str(req.query.q).trim();
    const fraseExacta = str(req.query.frase) === '1';
    const desdeSel = str(req.query.desde);
    const corte = corteDesde(desdeSel === 'ultima' ? str(req.query.ultima) : desdeSel);
    const orden = str(req.query.orden);

    const [todos, encontrados] = await Promise.all([
      this.kb.listar(user),
      q ? this.kb.listar(user, { texto: q, fraseExacta }) : Promise.resolve(null),
    ]);
    if (q.length >= 2) await this.historial.registrar(user, q);

    // Conteos por carpeta (de lo que coincide con la búsqueda, para saber dónde buscar).
    const base = encontrados ?? todos;
    const conteos = Object.fromEntries(CARPETAS_KB.map((c) => [c, base.filter((a) => a.carpeta === c).length]));
    let filtrados = carpeta ? base.filter((a) => a.carpeta === carpeta) : base;
    // Subcarpetas (empresa / tema) de la carpeta elegida, para filtrar con un clic.
    const subcarpetas = carpeta
      ? [...new Map(filtrados.filter((a) => a.subcarpeta).map((a) => [a.subcarpeta, 0])).keys()].sort((a, b) =>
          a.localeCompare(b, 'es', { numeric: true, sensitivity: 'base' }),
        )
      : [];
    if (sub) filtrados = filtrados.filter((a) => a.subcarpeta === sub || a.subcarpeta.startsWith(`${sub} / `));
    if (corte) filtrados = filtrados.filter((a) => a.updatedAt >= corte);
    const ordenados = ordenar(filtrados, orden, q);

    res.render('pages/backoffice/kb/gestion', {
      titulo: 'Base de conocimiento',
      articulos: ordenados.slice(0, MAX_FILAS).map((a) => ({ a, fragmento: q ? fragmentoKB(a, q) : null })),
      total: ordenados.length,
      maxFilas: MAX_FILAS,
      totalGeneral: todos.length,
      conteos,
      carpetas: CARPETAS_KB.map((c) => ({ id: c, etiqueta: CARPETA_KB_ETIQUETA[c] })),
      etiquetaCarpeta: CARPETA_KB_ETIQUETA,
      carpeta,
      subcarpetas,
      sub,
      q,
      fraseExacta,
      desde: desdeSel,
      orden,
      historial: await this.historial.listar(user),
      esPropietario: user.permisos.includes('kb:escribir'),
      rutas: user.permisos.includes('kb:escribir') ? await this.acceso.rutas() : null,
      aviso: str(req.query.aviso) || null,
    });
  };

  historialLimpiarPost = async (req: Request, res: Response): Promise<void> => {
    await this.historial.limpiar(req.user!);
    res.redirect('/app/kb');
  };

  ver = async (req: Request, res: Response): Promise<void> => {
    const user = req.user!;
    const articulo = await this.kb.ver(user, str(req.params.idOrSlug));
    res.render('pages/kb/articulo', {
      titulo: articulo.titulo,
      articulo,
      etiquetaCarpeta: CARPETA_KB_ETIQUETA[articulo.carpeta],
      cuerpoHtml: cuerpoHtml(articulo),
      relacionados: await this.kb.relacionados(user, articulo),
      esPropietario: user.permisos.includes('kb:publicar'),
    });
  };

  /** Vista dividida: dos artículos lado a lado (`?a=id&b=id`). */
  comparar = async (req: Request, res: Response): Promise<void> => {
    const user = req.user!;
    const idA = str(req.query.a);
    const idB = str(req.query.b);
    if (!idA) {
      res.redirect('/app/kb');
      return;
    }
    const articuloA = await this.kb.ver(user, idA);
    const articuloB = idB ? await this.kb.ver(user, idB) : null;
    const todos = await this.kb.listar(user);
    res.render('pages/kb/comparar', {
      titulo: articuloB ? `${articuloA.titulo} · ${articuloB.titulo}` : `Comparar: ${articuloA.titulo}`,
      articuloA,
      articuloB,
      cuerpoHtmlA: cuerpoHtml(articuloA),
      cuerpoHtmlB: articuloB ? cuerpoHtml(articuloB) : null,
      otros: todos.filter((a) => a.id !== articuloA.id && a.id !== articuloB?.id).sort(porTitulo),
    });
  };

  // ── Solo el propietario ───────────────────────────────────────────────────

  /** Huellas de lo ya indexado en una carpeta (el navegador compara y manda solo lo distinto). */
  indiceJson = async (req: Request, res: Response): Promise<void> => {
    const carpeta = str(req.query.carpeta);
    if (!esCarpetaKB(carpeta)) throw new ValidationError('Carpeta inválida', { carpeta: 'empresas o soporte' });
    res.json({ ok: true, indice: await this.kb.indice(req.user!, carpeta) });
  };

  /** Una tanda del indexado: `{ carpeta, archivos: [{ ruta, contenido }] }`. */
  indexarPost = async (req: Request, res: Response): Promise<void> => {
    const b = req.body ?? {};
    const carpeta = str(b.carpeta);
    if (!esCarpetaKB(carpeta)) throw new ValidationError('Carpeta inválida', { carpeta: 'empresas o soporte' });
    const archivos: ArchivoIndexado[] = Array.isArray(b.archivos)
      ? b.archivos.map((a: Record<string, unknown>) => ({ ruta: str(a.ruta), contenido: str(a.contenido) }))
      : [];
    res.json({ ok: true, ...(await this.kb.indexar(req.user!, carpeta, archivos)) });
  };

  /** Quita los que ya no existen en la carpeta de Windows: `{ carpeta, ids: [...] }`. */
  quitarPost = async (req: Request, res: Response): Promise<void> => {
    const b = req.body ?? {};
    const carpeta = str(b.carpeta);
    if (!esCarpetaKB(carpeta)) throw new ValidationError('Carpeta inválida', { carpeta: 'empresas o soporte' });
    res.json({ ok: true, quitados: await this.kb.quitar(req.user!, carpeta, arreglo(b.ids)) });
  };

  accesoView = async (req: Request, res: Response): Promise<void> => {
    const { filas, rutas } = await this.acceso.obtener(req.user!);
    res.render('pages/backoffice/kb/acceso', {
      titulo: 'Acceso a la base de conocimiento',
      filas,
      rutas,
      carpetas: CARPETAS_KB.map((c) => ({ id: c, etiqueta: CARPETA_KB_ETIQUETA[c] })),
      guardado: req.query.ok === '1',
    });
  };

  accesoPost = async (req: Request, res: Response): Promise<void> => {
    const b = req.body ?? {};
    await this.acceso.guardarAcceso(req.user!, arreglo(b.acceso));
    await this.acceso.guardarRutas(req.user!, { empresas: str(b.rutaEmpresas), soporte: str(b.rutaSoporte) });
    invalidarCacheAccesoKB();
    res.redirect('/app/kb/acceso?ok=1');
  };

  exportZip = async (req: Request, res: Response): Promise<void> => {
    const carpeta = str(req.query.carpeta);
    const desde = corteDesde(str(req.query.desde) === 'ultima' ? str(req.query.ultima) : str(req.query.desde));
    const buffer = await this.kb.exportarZip(req.user!, {
      ...(esCarpetaKB(carpeta) ? { carpeta } : {}),
      ...(desde ? { desde } : {}),
    });
    const fecha = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Disposition', `attachment; filename="kb-${carpeta || 'todo'}-${fecha}.zip"`);
    res.type('application/zip').send(buffer);
  };

  eliminarPost = async (req: Request, res: Response): Promise<void> => {
    await this.kb.eliminar(req.user!, str(req.params.id));
    res.redirect('/app/kb?aviso=' + encodeURIComponent('Documento eliminado'));
  };
}
