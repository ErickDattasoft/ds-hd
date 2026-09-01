import type { ArticuloKB } from '../../entities/ArticuloKB.js';

export interface ListarKBFiltro {
  categoria?: string;
  publicado?: boolean;
  texto?: string;
}

/** Persistencia de la base de conocimiento (`knowledge_base/{id}`). */
export interface IKnowledgeRepository {
  findById(id: string): Promise<ArticuloKB | null>;
  findBySlug(slug: string): Promise<ArticuloKB | null>;
  list(filtro?: ListarKBFiltro): Promise<ArticuloKB[]>;
  save(articulo: ArticuloKB): Promise<void>;
  eliminar(id: string): Promise<void>;
}
