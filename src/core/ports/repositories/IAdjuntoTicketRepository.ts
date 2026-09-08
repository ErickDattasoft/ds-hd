import type { AdjuntoTicket, AdjuntoTicketMeta } from '../../entities/AdjuntoTicket.js';

/** Persistencia de los adjuntos de tickets (colección `tickets_adjuntos`, un doc por archivo). */
export interface IAdjuntoTicketRepository {
  /** Guarda un adjunto nuevo (con su contenido). */
  crear(adjunto: AdjuntoTicket): Promise<void>;
  /** Metadatos de los adjuntos de un ticket, del más viejo al más nuevo. Sin el contenido. */
  listarPorTicket(ticketId: string): Promise<AdjuntoTicketMeta[]>;
  /** Un adjunto completo (con contenido) por id, o `null`. */
  obtener(id: string): Promise<AdjuntoTicket | null>;
  /** Borra un adjunto. */
  eliminar(id: string): Promise<void>;
  /** Borra todos los adjuntos de un ticket (al eliminar el ticket de la papelera). */
  eliminarPorTicket(ticketId: string): Promise<void>;
}
