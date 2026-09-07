import type { Ticket } from '../../entities/Ticket.js';
import type { EventoTicket, NotaTicket } from '../../entities/NotaTicket.js';

/**
 * Persistencia (lado comando) de tickets: `tickets/{id}` + subcolecciones `notas` y `eventos`.
 * Las consultas de listado/tablero viven en `ITicketQueries` (ISP).
 *
 * Semántica compartida por la impl Firestore y los fakes (LSP): `findById` → `null` si no
 * existe; `save` hace upsert por `id`.
 */
export interface ITicketRepository {
  findById(id: string): Promise<Ticket | null>;
  findByNumero(numero: number): Promise<Ticket | null>;
  save(ticket: Ticket): Promise<void>;
  /** Borrado permanente, incluidas notas y eventos (solo desde la papelera). */
  eliminar(id: string): Promise<void>;

  agregarNota(ticketId: string, nota: NotaTicket): Promise<void>;
  listarNotas(ticketId: string): Promise<NotaTicket[]>;

  registrarEvento(ticketId: string, evento: EventoTicket): Promise<void>;
  listarEventos(ticketId: string): Promise<EventoTicket[]>;
}
