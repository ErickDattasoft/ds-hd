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

  /**
   * Guarda el ticket con sus notas y eventos en UNA sola escritura.
   *
   * Es para cargas masivas (importar el respaldo del CRM viejo): hacerlo documento a documento
   * son cientos de llamadas HTTP y la importación se corta al chocar con el tope de
   * subpeticiones del worker.
   */
  guardarConDetalle(ticket: Ticket, notas: NotaTicket[], eventos: EventoTicket[]): Promise<void>;

  /** Muchos tickets con su detalle, en el menor número de escrituras posible. */
  guardarVariosConDetalle(
    items: { ticket: Ticket; notas: NotaTicket[]; eventos: EventoTicket[] }[],
  ): Promise<void>;

  /** Borrado permanente de varios tickets (con sus notas y eventos), agrupando las llamadas. */
  eliminarVarios(ids: string[]): Promise<void>;
}
