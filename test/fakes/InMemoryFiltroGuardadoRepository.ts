import type { IFiltroGuardadoRepository } from '../../src/core/ports/repositories/IFiltroGuardadoRepository.js';
import type { FiltroGuardado } from '../../src/core/entities/FiltroGuardado.js';

/** Fake en memoria de {@link IFiltroGuardadoRepository}. */
export class InMemoryFiltroGuardadoRepository implements IFiltroGuardadoRepository {
  readonly items = new Map<string, FiltroGuardado>();

  async findById(id: string): Promise<FiltroGuardado | null> {
    return this.items.get(id) ?? null;
  }

  async listar(uid: string, modulo?: string): Promise<FiltroGuardado[]> {
    return [...this.items.values()]
      .filter((f) => f.uid === uid && (!modulo || f.modulo === modulo))
      .sort((a, b) => b.creadoEn.getTime() - a.creadoEn.getTime());
  }

  async guardar(f: FiltroGuardado): Promise<void> {
    this.items.set(f.id, f);
  }

  async eliminar(id: string): Promise<void> {
    this.items.delete(id);
  }
}
