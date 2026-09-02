import { ValidationError } from '../errors/DomainError.js';

export type VisibilidadKB = 'staff' | 'portal' | 'publico';

/** Props para construir un {@link ArticuloKB}; `slug` se autogenera del título si se omite. */
export interface ArticuloKBProps {
  id: string;
  titulo: string;
  slug?: string;
  categoria?: string | null;
  cuerpoMarkdown: string;
  tags?: string[];
  publicado?: boolean;
  visibilidad?: VisibilidadKB;
  autorUid?: string | null;
  autorNombre?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
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
    this.publicado = props.publicado ?? false;
    this.visibilidad = props.visibilidad ?? 'staff';
    this.autorUid = props.autorUid ?? null;
    this.autorNombre = props.autorNombre ?? null;
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? this.createdAt;
  }

  /** ¿Un usuario con este rol/área puede ver el artículo? */
  visiblePara(contexto: { esStaff: boolean; esCliente: boolean; anonimo: boolean }): boolean {
    if (!this.publicado) return contexto.esStaff;
    if (this.visibilidad === 'publico') return true;
    if (this.visibilidad === 'portal') return contexto.esStaff || contexto.esCliente;
    return contexto.esStaff;
  }
}
