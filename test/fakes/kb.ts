import type { IVersionRepository } from '../../src/core/ports/repositories/IVersionRepository.js';
import type { IKnowledgeRepository, ListarKBFiltro } from '../../src/core/ports/repositories/IKnowledgeRepository.js';
import type { VersionSistema } from '../../src/core/entities/VersionSistema.js';
import type { ArticuloKB } from '../../src/core/entities/ArticuloKB.js';

export class InMemoryVersionRepository implements IVersionRepository {
  readonly items = new Map<string, VersionSistema>();
  async findById(id: string): Promise<VersionSistema | null> {
    return this.items.get(id) ?? null;
  }
  async list(): Promise<VersionSistema[]> {
    return [...this.items.values()].sort((a, b) => a.sistema.localeCompare(b.sistema, 'es'));
  }
  async save(v: VersionSistema): Promise<void> {
    this.items.set(v.id, v);
  }
  async eliminar(id: string): Promise<void> {
    this.items.delete(id);
  }
}

export class InMemoryKnowledgeRepository implements IKnowledgeRepository {
  readonly items = new Map<string, ArticuloKB>();
  async findById(id: string): Promise<ArticuloKB | null> {
    return this.items.get(id) ?? null;
  }
  async findBySlug(slug: string): Promise<ArticuloKB | null> {
    return [...this.items.values()].find((a) => a.slug === slug) ?? null;
  }
  async list(f: ListarKBFiltro = {}): Promise<ArticuloKB[]> {
    let out = [...this.items.values()];
    if (f.publicado !== undefined) out = out.filter((a) => a.publicado === f.publicado);
    if (f.categoria) out = out.filter((a) => a.categoria === f.categoria);
    if (f.texto) {
      const t = f.texto.toLowerCase();
      out = out.filter((a) => a.titulo.toLowerCase().includes(t) || a.tags.some((x) => x.includes(t)));
    }
    return out.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }
  async save(a: ArticuloKB): Promise<void> {
    this.items.set(a.id, a);
  }
  async eliminar(id: string): Promise<void> {
    this.items.delete(id);
  }
}
