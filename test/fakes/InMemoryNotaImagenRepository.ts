import type { INotaImagenRepository } from '../../src/core/ports/repositories/INotaImagenRepository.js';
import type { NotaImagen } from '../../src/core/entities/NotaPersonal.js';

/** Fake en memoria de {@link INotaImagenRepository}. */
export class InMemoryNotaImagenRepository implements INotaImagenRepository {
  readonly items = new Map<string, NotaImagen>();
  async crear(i: NotaImagen): Promise<void> {
    this.items.set(i.id, { ...i });
  }
  async obtener(id: string): Promise<NotaImagen | null> {
    return this.items.get(id) ?? null;
  }
  async eliminarVarias(ids: readonly string[]): Promise<void> {
    for (const id of ids) this.items.delete(id);
  }
  async listarTodas(): Promise<NotaImagen[]> {
    return [...this.items.values()];
  }
}
