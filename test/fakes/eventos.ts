import type {
  IEventoRepository,
  IInscripcionRepository,
  IListaNegraRepository,
} from '../../src/core/ports/repositories/IEventoRepository.js';
import type { Evento } from '../../src/core/entities/Evento.js';
import type { EntradaListaNegra, Inscripcion } from '../../src/core/entities/Inscripcion.js';

export class InMemoryEventoRepository implements IEventoRepository {
  readonly items = new Map<string, Evento>();
  async findById(id: string): Promise<Evento | null> {
    return this.items.get(id) ?? null;
  }
  async list(soloPublicados = false): Promise<Evento[]> {
    return [...this.items.values()]
      .filter((e) => !soloPublicados || e.estado === 'publicado')
      .sort((a, b) => b.fechaHora.getTime() - a.fechaHora.getTime());
  }
  async proximos(desde: Date, hasta: Date): Promise<Evento[]> {
    return [...this.items.values()].filter(
      (e) =>
        e.estado === 'publicado' &&
        e.fechaHora.getTime() >= desde.getTime() &&
        e.fechaHora.getTime() <= hasta.getTime(),
    );
  }
  async save(e: Evento): Promise<void> {
    this.items.set(e.id, e);
  }
  async eliminar(id: string): Promise<void> {
    this.items.delete(id);
  }
}

export class InMemoryInscripcionRepository implements IInscripcionRepository {
  readonly items: Inscripcion[] = [];
  async create(i: Inscripcion): Promise<void> {
    this.items.push(i);
  }
  async save(i: Inscripcion): Promise<void> {
    const idx = this.items.findIndex((x) => x.id === i.id);
    if (idx >= 0) this.items[idx] = i;
    else this.items.push(i);
  }
  async findByEmail(eventoId: string, email: string): Promise<Inscripcion | null> {
    return (
      this.items.find((i) => i.eventoId === eventoId && i.email === email.trim().toLowerCase()) ?? null
    );
  }
  async findGlobal(inscripcionId: string): Promise<Inscripcion | null> {
    return this.items.find((i) => i.id === inscripcionId) ?? null;
  }
  async listPorEvento(eventoId: string): Promise<Inscripcion[]> {
    return this.items.filter((i) => i.eventoId === eventoId);
  }
  async contar(eventoId: string): Promise<number> {
    return this.items.filter((i) => i.eventoId === eventoId).length;
  }
  async contarPorIp(eventoId: string, ip: string): Promise<number> {
    return this.items.filter((i) => i.eventoId === eventoId && i.ip === ip).length;
  }
  async eliminarPorEvento(eventoId: string): Promise<void> {
    for (let i = this.items.length - 1; i >= 0; i--) {
      if (this.items[i]!.eventoId === eventoId) this.items.splice(i, 1);
    }
  }
}

export class InMemoryListaNegraRepository implements IListaNegraRepository {
  readonly items = new Map<string, EntradaListaNegra>();
  async contiene(email: string): Promise<boolean> {
    return this.items.has(email.trim().toLowerCase());
  }
  async list(): Promise<EntradaListaNegra[]> {
    return [...this.items.values()];
  }
  async agregar(e: EntradaListaNegra): Promise<void> {
    this.items.set(e.email.trim().toLowerCase(), e);
  }
  async quitar(email: string): Promise<void> {
    this.items.delete(email.trim().toLowerCase());
  }
}
