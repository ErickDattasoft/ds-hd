import type { IRespuestaSinLeerRepository } from '../../src/core/ports/repositories/IRespuestaSinLeerRepository.js';
import { idAvisoRespuesta, type RespuestaSinLeer } from '../../src/core/entities/RespuestaSinLeer.js';

/** Fake en memoria de {@link IRespuestaSinLeerRepository}. */
export class InMemoryRespuestaSinLeerRepository implements IRespuestaSinLeerRepository {
  readonly items = new Map<string, RespuestaSinLeer>();

  async guardar(r: RespuestaSinLeer): Promise<void> {
    this.items.set(idAvisoRespuesta(r), r);
  }

  async listar(): Promise<RespuestaSinLeer[]> {
    return [...this.items.values()];
  }

  async quitar(ticketId: string): Promise<boolean> {
    return this.items.delete(ticketId);
  }

  async marcarLeidaPor(ticketId: string, persona: { uid: string; nombre: string }): Promise<boolean> {
    const r = this.items.get(ticketId);
    if (!r || (r.leidaPor ?? []).some((p) => p.uid === persona.uid)) return false;
    this.items.set(ticketId, { ...r, leidaPor: [...(r.leidaPor ?? []), { ...persona }] });
    return true;
  }
}
