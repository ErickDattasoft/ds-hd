import type { IVersionRepository } from '../../src/core/ports/repositories/IVersionRepository.js';
import type { IKnowledgeRepository, ListarKBFiltro } from '../../src/core/ports/repositories/IKnowledgeRepository.js';
import type { IPizarraKBRepository } from '../../src/core/ports/repositories/IPizarraKBRepository.js';
import type { IBusquedaKBRepository } from '../../src/core/ports/repositories/IBusquedaKBRepository.js';
import type { VersionSistema } from '../../src/core/entities/VersionSistema.js';
import { coincideTexto, type ArticuloKB } from '../../src/core/entities/ArticuloKB.js';
import type { PizarraKB } from '../../src/core/entities/PizarraKB.js';
import type { BusquedaKB } from '../../src/core/entities/BusquedaKB.js';
import type { IAvisoRepository } from '../../src/core/ports/repositories/IAvisoRepository.js';
import { avisoCoincide, type AvisoEnviado, type FiltroAvisos } from '../../src/core/entities/AvisoEnviado.js';

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
  async eliminarVarios(ids: string[]): Promise<void> {
    for (const id of ids) await this.eliminar(id);
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
    if (f.tag) out = out.filter((a) => a.tags.includes(f.tag!));
    if (f.texto) out = out.filter((a) => coincideTexto(a, f.texto!, f.fraseExacta ?? false));
    return out.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }
  async save(a: ArticuloKB): Promise<void> {
    this.items.set(a.id, a);
  }
  async eliminar(id: string): Promise<void> {
    this.items.delete(id);
  }
  async eliminarVarios(ids: string[]): Promise<void> {
    for (const id of ids) await this.eliminar(id);
  }
}

export class InMemoryPizarraKBRepository implements IPizarraKBRepository {
  readonly items = new Map<string, PizarraKB>();
  async obtener(uid: string): Promise<PizarraKB | null> {
    return this.items.get(uid) ?? null;
  }
  async guardar(p: PizarraKB): Promise<void> {
    this.items.set(p.uid, p);
  }
}

export class InMemoryBusquedaKBRepository implements IBusquedaKBRepository {
  readonly items = new Map<string, BusquedaKB>();
  async listar(uid: string): Promise<BusquedaKB[]> {
    return [...this.items.values()]
      .filter((b) => b.uid === uid)
      .sort((a, b) => b.creadoEn.getTime() - a.creadoEn.getTime());
  }
  async guardar(b: BusquedaKB): Promise<void> {
    this.items.set(b.id, b);
  }
  async eliminar(id: string): Promise<void> {
    this.items.delete(id);
  }
  async limpiar(uid: string): Promise<void> {
    for (const [id, b] of this.items) if (b.uid === uid) this.items.delete(id);
  }
}

export class InMemoryAvisoRepository implements IAvisoRepository {
  readonly items: AvisoEnviado[] = [];
  async registrar(avisos: AvisoEnviado[]): Promise<void> {
    this.items.push(...avisos);
  }
  async list(filtro: FiltroAvisos = {}): Promise<AvisoEnviado[]> {
    return this.items
      .filter((a) => avisoCoincide(a, filtro))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}
