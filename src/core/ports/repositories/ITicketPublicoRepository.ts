import type { TicketPublico } from '../../entities/TicketPublico.js';

/** Buzón de tickets entrantes del portal público (`tickets_publicos`). */
export interface ITicketPublicoRepository {
  create(data: Omit<TicketPublico, 'id' | 'estado' | 'ticketNumero' | 'createdAt'>): Promise<TicketPublico>;
  findById(id: string): Promise<TicketPublico | null>;
  listPendientes(): Promise<TicketPublico[]>;
  /** Cuántos esperan revisión (conteo del servidor, sin bajar los documentos). */
  contarPendientes(): Promise<number>;
  marcarAceptado(id: string, ticketNumero: number): Promise<void>;
  marcarRechazado(id: string): Promise<void>;
}
