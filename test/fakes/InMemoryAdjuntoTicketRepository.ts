import type { IAdjuntoTicketRepository } from '../../src/core/ports/repositories/IAdjuntoTicketRepository.js';
import type { AdjuntoTicket, AdjuntoTicketMeta } from '../../src/core/entities/AdjuntoTicket.js';

/** Fake en memoria de {@link IAdjuntoTicketRepository}. */
export class InMemoryAdjuntoTicketRepository implements IAdjuntoTicketRepository {
  readonly docs = new Map<string, AdjuntoTicket>();

  async crear(a: AdjuntoTicket): Promise<void> {
    this.docs.set(a.id, { ...a });
  }

  async listarPorTicket(ticketId: string): Promise<AdjuntoTicketMeta[]> {
    return [...this.docs.values()]
      .filter((a) => a.ticketId === ticketId)
      .sort((x, y) => x.createdAt.getTime() - y.createdAt.getTime())
      .map(({ data: _d, ...meta }) => {
        void _d;
        return meta;
      });
  }

  async obtener(id: string): Promise<AdjuntoTicket | null> {
    const a = this.docs.get(id);
    return a ? { ...a } : null;
  }

  async eliminar(id: string): Promise<void> {
    this.docs.delete(id);
  }

  async eliminarPorTicket(ticketId: string): Promise<void> {
    for (const [id, a] of this.docs) if (a.ticketId === ticketId) this.docs.delete(id);
  }
}
