import type {
  IInteraccionRepository,
  ITareaRepository,
  ListarTareasFiltro,
} from '../../src/core/ports/repositories/ISeguimientoRepository.js';
import type { Interaccion } from '../../src/core/entities/Interaccion.js';
import type { Tarea } from '../../src/core/entities/Tarea.js';

export class InMemoryInteraccionRepository implements IInteraccionRepository {
  readonly items: Interaccion[] = [];
  async create(i: Interaccion): Promise<void> {
    this.items.push(i);
  }
  async listPorEmpresa(empresaId: string): Promise<Interaccion[]> {
    return this.items
      .filter((i) => i.empresaId === empresaId)
      .sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
  }
  async listRecientes(limite: number): Promise<Interaccion[]> {
    return [...this.items].sort((a, b) => b.fecha.getTime() - a.fecha.getTime()).slice(0, limite);
  }
}

export class InMemoryTareaRepository implements ITareaRepository {
  readonly items = new Map<string, Tarea>();
  async findById(id: string): Promise<Tarea | null> {
    return this.items.get(id) ?? null;
  }
  async list(f: ListarTareasFiltro = {}): Promise<Tarea[]> {
    let out = [...this.items.values()];
    if (f.asignadoAUid) out = out.filter((t) => t.asignadoAUid === f.asignadoAUid);
    if (f.completada !== undefined) out = out.filter((t) => t.completada === f.completada);
    if (f.empresaId) out = out.filter((t) => t.empresaId === f.empresaId);
    return out.sort((a, b) => (a.vence ?? '9999').localeCompare(b.vence ?? '9999'));
  }
  async save(t: Tarea): Promise<void> {
    this.items.set(t.id, t);
  }
}
