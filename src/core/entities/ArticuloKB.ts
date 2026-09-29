import { ValidationError } from '../errors/DomainError.js';

/**
 * Quién ve un artículo, por ROL (como el panel «👥 Acceso» del viejo, que era solo del equipo):
 * `admin` = solo quien tiene el rol Administrador; `soporte` = Administrador o Soporte técnico.
 * Clientes y público ya no ven la base de conocimiento.
 */
export type VisibilidadKB = 'admin' | 'soporte';

/** Valores viejos (`staff`, `portal`, `publico`) → `soporte`; se leen así sin reescribir datos. */
export function sanearVisibilidadKB(v: unknown): VisibilidadKB {
  return v === 'admin' ? 'admin' : 'soporte';
}

/** Quién está pidiendo: basta con sus roles. */
export interface ContextoKB {
  roles: readonly string[];
}

/** Props para construir un {@link ArticuloKB}; `slug` se autogenera del título si se omite. */
export interface ArticuloKBProps {
  id: string;
  titulo: string;
  slug?: string;
  categoria?: string | null;
  cuerpoMarkdown: string;
  tags?: string[];
  /** Ruta destino en Windows (para scripts que se despliegan a una carpeta). */
  rutaDestino?: string | null;
  publicado?: boolean;
  visibilidad?: VisibilidadKB;
  autorUid?: string | null;
  autorNombre?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/** Categorías sugeridas de la base de conocimiento (paridad con el CRM viejo). */
export const CATEGORIAS_KB = ['solucion', 'empresa', 'script'] as const;

/** Extensiones que se consideran "script" al subir archivos en lote. */
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

/** Artículo de la base de conocimiento. */
export class ArticuloKB {
  readonly id: string;
  titulo: string;
  slug: string;
  categoria: string | null;
  cuerpoMarkdown: string;
  tags: string[];
  rutaDestino: string | null;
  publicado: boolean;
  visibilidad: VisibilidadKB;
  readonly autorUid: string | null;
  autorNombre: string | null;
  readonly createdAt: Date;
  updatedAt: Date;

  constructor(props: ArticuloKBProps) {
    if (props.titulo.trim().length < 3) {
      throw new ValidationError('El título es obligatorio', { titulo: 'Mínimo 3 caracteres' });
    }
    if (props.cuerpoMarkdown.trim().length < 10) {
      throw new ValidationError('El contenido es muy corto', { cuerpoMarkdown: 'Mínimo 10 caracteres' });
    }
    this.id = props.id;
    this.titulo = props.titulo.trim();
    this.slug = props.slug?.trim() || slugify(props.titulo);
    this.categoria = props.categoria?.trim() || null;
    this.cuerpoMarkdown = props.cuerpoMarkdown;
    this.tags = [...new Set((props.tags ?? []).map((t) => t.trim().toLowerCase()).filter(Boolean))];
    this.rutaDestino = props.rutaDestino?.trim() || null;
    this.publicado = props.publicado ?? false;
    this.visibilidad = sanearVisibilidadKB(props.visibilidad);
    this.autorUid = props.autorUid ?? null;
    this.autorNombre = props.autorNombre ?? null;
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? this.createdAt;
  }

  /** ¿Es un script (por categoría)? */
  get esScript(): boolean {
    return this.categoria === 'script';
  }

  /** ¿Lo puede ver alguien con estos roles? (ver {@link VisibilidadKB}) */
  visiblePara(contexto: ContextoKB): boolean {
    const esAdmin = contexto.roles.includes('admin');
    if (this.visibilidad === 'admin') return esAdmin;
    return esAdmin || contexto.roles.includes('soporte');
  }
}

/**
 * ¿El artículo coincide con una búsqueda de texto? Busca en título, cuerpo y tags.
 * Por defecto (`fraseExacta=false`) exige que CADA palabra de `texto` aparezca en algún lado
 * (más laxo, mejor recall); con `fraseExacta=true` exige la frase completa como substring
 * contiguo en un solo campo (más estricto).
 */
export function coincideTexto(articulo: ArticuloKB, texto: string, fraseExacta: boolean): boolean {
  const t = texto.trim().toLowerCase();
  if (!t) return true;
  const campos = [articulo.titulo.toLowerCase(), articulo.cuerpoMarkdown.toLowerCase(), ...articulo.tags];
  if (fraseExacta) return campos.some((c) => c.includes(t));
  const palabras = t.split(/\s+/).filter(Boolean);
  return palabras.every((p) => campos.some((c) => c.includes(p)));
}
