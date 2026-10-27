import { ValidationError } from '../errors/DomainError.js';

/**
 * Las dos carpetas de la base de conocimiento, separadas como en Windows. Cada una se indexa
 * desde su propia carpeta local y nunca se mezclan.
 */
export const CARPETAS_KB = ['empresas', 'soporte'] as const;
export type CarpetaKB = (typeof CARPETAS_KB)[number];

export const CARPETA_KB_ETIQUETA: Record<CarpetaKB, string> = {
  empresas: '🏢 Empresas',
  soporte: '🛠 Soporte y licencias',
};

/** ¿Es una de las dos carpetas válidas? */
export function esCarpetaKB(v: unknown): v is CarpetaKB {
  return v === 'empresas' || v === 'soporte';
}

/**
 * Carpeta guardada; los artículos de antes de que existiera el campo se reparten por su
 * categoría (`empresa` → Empresas, todo lo demás → Soporte y licencias), sin reescribir datos.
 */
export function sanearCarpetaKB(v: unknown, categoria?: string | null): CarpetaKB {
  if (esCarpetaKB(v)) return v;
  return categoria === 'empresa' ? 'empresas' : 'soporte';
}

/** Props para construir un {@link ArticuloKB}; `slug` se autogenera del título si se omite. */
export interface ArticuloKBProps {
  id: string;
  titulo: string;
  slug?: string;
  carpeta?: CarpetaKB;
  categoria?: string | null;
  cuerpoMarkdown: string;
  tags?: string[];
  /** Ruta del archivo dentro de la carpeta indexada (con la carpeta raíz, como `EMPRESAS/x.md`). */
  rutaDestino?: string | null;
  autorUid?: string | null;
  autorNombre?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/** Categorías sugeridas de la base de conocimiento (paridad con el CRM viejo). */
export const CATEGORIAS_KB = ['solucion', 'empresa', 'script'] as const;

/** Extensiones que se consideran "script" al indexar. */
const EXT_SCRIPT = ['ps1', 'bat', 'cmd', 'sql', 'sh', 'py'];

/** Adivina la categoría de un archivo por su nombre (`script` si parece un script). */
export function adivinarCategoriaKB(nombreArchivo: string): string {
  const n = nombreArchivo.toLowerCase();
  const ext = n.includes('.') ? n.split('.').pop()! : '';
  if (EXT_SCRIPT.includes(ext) || /script|query|consulta/.test(n)) return 'script';
  return 'solucion';
}

/** Convierte un título a slug URL-friendly (sin acentos, minúsculas, guiones). */
export function slugify(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/** Ruta con `/`, sin barras de sobra y en minúsculas: dos rutas iguales en Windows dan lo mismo. */
export function normalizarRutaKB(ruta: string): string {
  return ruta.replace(/\\/g, '/').replace(/\/{2,}/g, '/').replace(/^\/+|\/+$/g, '').trim().toLowerCase();
}

/**
 * Clave para reconocer el MISMO archivo al reindexar: la ruta sin la carpeta raíz. Así,
 * renombrar la carpeta de Windows (o elegirla con otro nombre) no duplica todo — que es
 * justo lo que hacía el indexado del CRM viejo.
 */
export function claveRutaKB(ruta: string): string {
  const n = normalizarRutaKB(ruta);
  const i = n.indexOf('/');
  return i >= 0 ? n.slice(i + 1) : n;
}

/** Artículo de la base de conocimiento: un archivo indexado de una de las dos carpetas. */
export class ArticuloKB {
  readonly id: string;
  titulo: string;
  slug: string;
  carpeta: CarpetaKB;
  categoria: string | null;
  cuerpoMarkdown: string;
  tags: string[];
  rutaDestino: string | null;
  readonly autorUid: string | null;
  autorNombre: string | null;
  readonly createdAt: Date;
  updatedAt: Date;

  constructor(props: ArticuloKBProps) {
    if (props.titulo.trim().length < 1) {
      throw new ValidationError('El título es obligatorio', { titulo: 'Requerido' });
    }
    if (!props.cuerpoMarkdown.trim()) {
      throw new ValidationError('El contenido está vacío', { cuerpoMarkdown: 'Requerido' });
    }
    this.id = props.id;
    this.titulo = props.titulo.trim();
    this.slug = props.slug?.trim() || slugify(props.titulo);
    this.categoria = props.categoria?.trim() || null;
    this.carpeta = sanearCarpetaKB(props.carpeta, this.categoria);
    this.cuerpoMarkdown = props.cuerpoMarkdown;
    this.tags = [...new Set((props.tags ?? []).map((t) => t.trim().toLowerCase()).filter(Boolean))];
    this.rutaDestino = props.rutaDestino?.trim() || null;
    this.autorUid = props.autorUid ?? null;
    this.autorNombre = props.autorNombre ?? null;
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? this.createdAt;
  }

  /** ¿Es un script (por categoría)? */
  get esScript(): boolean {
    return this.categoria === 'script';
  }

  /** ¿Se muestra como Markdown? Los `.ps1`, `.sql`, `.txt`… se muestran tal cual (texto plano). */
  get esMarkdown(): boolean {
    if (!this.rutaDestino) return true;
    return /\.(md|markdown)$/i.test(this.rutaDestino);
  }

  /** Subcarpeta dentro de la carpeta indexada (sin la raíz ni el archivo), p. ej. `ACME/Nóminas`. */
  get subcarpeta(): string {
    const partes = (this.rutaDestino ?? '').replace(/\\/g, '/').split('/').filter(Boolean);
    return partes.slice(1, -1).join(' / ');
  }
}

/** Minúsculas y sin acentos, para buscar «nomina» y encontrar «Nómina». */
function plano(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/**
 * ¿El artículo coincide con una búsqueda? Busca en nombre, ruta (empresa/subcarpetas), tags y
 * contenido, sin distinguir mayúsculas ni acentos. Por defecto (`fraseExacta=false`) exige que
 * CADA palabra aparezca en algún lado; con `fraseExacta=true`, la frase completa en un campo.
 */
export function coincideTexto(articulo: ArticuloKB, texto: string, fraseExacta: boolean): boolean {
  const t = plano(texto.trim());
  if (!t) return true;
  const campos = [articulo.titulo, articulo.rutaDestino ?? '', articulo.cuerpoMarkdown, ...articulo.tags].map(plano);
  if (fraseExacta) return campos.some((c) => c.includes(t));
  const palabras = t.split(/\s+/).filter(Boolean);
  return palabras.every((p) => campos.some((c) => c.includes(p)));
}

/** Fragmento del contenido alrededor de la coincidencia, partido para resaltarla. */
export interface FragmentoKB {
  antes: string;
  coincidencia: string;
  despues: string;
}

/**
 * Primer pedazo del contenido donde aparece la búsqueda (la frase o, si no, su primera palabra
 * que sí esté), para que el resultado muestre POR QUÉ salió. `null` si solo coincidió el nombre.
 */
export function fragmentoKB(articulo: ArticuloKB, texto: string, radio = 70): FragmentoKB | null {
  const cuerpo = articulo.cuerpoMarkdown;
  // Mapa carácter a carácter: el texto «plano» puede no medir lo mismo que el original.
  let planoCuerpo = '';
  const origen: number[] = [];
  for (let i = 0; i < cuerpo.length; i++) {
    const p = plano(cuerpo[i]!);
    for (let k = 0; k < p.length; k++) origen.push(i);
    planoCuerpo += p;
  }
  const t = plano(texto.trim());
  if (!t) return null;
  const candidatos = [t, ...t.split(/\s+/).filter((p) => p.length >= 2)];
  for (const c of candidatos) {
    const pos = planoCuerpo.indexOf(c);
    if (pos < 0) continue;
    const ini = origen[pos]!;
    const fin = origen[pos + c.length - 1]! + 1;
    const desde = Math.max(0, ini - radio);
    const hasta = Math.min(cuerpo.length, fin + radio);
    const limpio = (s: string) => s.replace(/\s+/g, ' ');
    return {
      antes: (desde > 0 ? '…' : '') + limpio(cuerpo.slice(desde, ini)),
      coincidencia: limpio(cuerpo.slice(ini, fin)),
      despues: limpio(cuerpo.slice(fin, hasta)) + (hasta < cuerpo.length ? '…' : ''),
    };
  }
  return null;
}
