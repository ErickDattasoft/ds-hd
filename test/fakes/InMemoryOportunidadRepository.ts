import type { IOportunidadRepository } from '../../src/core/ports/repositories/IOportunidadRepository.js';
import type { Oportunidad } from '../../src/core/entities/Oportunidad.js';

/** Fake en memoria de {@link IOportunidadRepository}. */
export class InMemoryOportunidadRepository implements IOportunidadRepository {
  readonly items = new Map<string, Oportunidad>();
  async findById(id: string): Promise<Oportunidad | null> {
    return this.items.get(id) ?? null;
  }
  async list(): Promise<Oportunidad[]> {
    return [...this.items.values()].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }
  async save(o: Oportunidad): Promise<void> {
    this.items.set(o.id, o);
  }
  async delete(id: string): Promise<void> {
    this.items.delete(id);
  }
}
