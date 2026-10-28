import type { IRespuestaSinLeerRepository } from '../../src/core/ports/repositories/IRespuestaSinLeerRepository.js';
import type { RespuestaSinLeer } from '../../src/core/entities/RespuestaSinLeer.js';

/** Fake en memoria de {@link IRespuestaSinLeerRepository}. */
export class InMemoryRespuestaSinLeerRepository implements IRespuestaSinLeerRepository {
  readonly items = new Map<string, RespuestaSinLeer>();

  async guardar(r: RespuestaSinLeer): Promise<void> {
    this.items.set(r.ticketId, r);
  }

  async listar(): Promise<RespuestaSinLeer[]> {
    return [...this.items.values()];
  }

  async quitar(ticketId: string): Promise<boolean> {
    return this.items.delete(ticketId);
  }
}
