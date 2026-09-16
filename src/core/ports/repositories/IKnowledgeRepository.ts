import type { ArticuloKB } from '../../entities/ArticuloKB.js';

/** Filtros para listar artículos de la base de conocimiento. */
export interface ListarKBFiltro {
  categoria?: string;
  publicado?: boolean;
  texto?: string;
  /** Si viene junto a `texto`: exige la frase completa como substring contiguo (en vez de
   * exigir cada palabra por separado, más laxo). */
  fraseExacta?: boolean;
  /** Solo artículos que tengan este tag exacto. */
  tag?: string;
}

/** Persistencia de la base de conocimiento (`knowledge_base/{id}`). */
export interface IKnowledgeRepository {
  findById(id: string): Promise<ArticuloKB | null>;
  findBySlug(slug: string): Promise<ArticuloKB | null>;
  list(filtro?: ListarKBFiltro): Promise<ArticuloKB[]>;
  save(articulo: ArticuloKB): Promise<void>;
  eliminar(id: string): Promise<void>;
}
