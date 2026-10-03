import { ticketEsDeAgente, ticketSinNadieAsignado, type Ticket } from '../../core/entities/Ticket.js';
import type { FiltroTickets } from '../../core/ports/repositories/ITicketQueries.js';
import type { SessionUser } from '../shared/SessionUser.js';

/** ¿El actor ve todos los tickets? (admin, supervisor, lectura…: tiene `tickets:leer_todos`). */
export function veTodosLosTickets(actor: SessionUser): boolean {
  return actor.permisos.includes('tickets:leer_todos');
}

/**
 * Filtro de alcance para listados/conteos: quien no ve todos ve los suyos (por uid o por nombre en
 * "Agente"/"Canalizado a") más los que nadie tiene todavía — si no, los sin asignar quedarían
 * invisibles para todo el equipo hasta que un admin los repartiera (igual que el CRM viejo).
 */
export function alcanceTickets(actor: SessionUser): Pick<FiltroTickets, 'alcanceAgente'> {
  return veTodosLosTickets(actor) ? {} : { alcanceAgente: { uid: actor.uid, nombre: actor.nombre } };
}

/** Misma regla que {@link alcanceTickets}, para un ticket suelto (ver/editar/escribir). */
export function ticketVisiblePara(
  ticket: Pick<Ticket, 'agenteAsignadoUid' | 'agenteAsignadoNombre' | 'canalizadoA'>,
  actor: SessionUser,
): boolean {
  return (
    veTodosLosTickets(actor) ||
    ticketEsDeAgente(ticket, { uid: actor.uid, nombre: actor.nombre }) ||
    ticketSinNadieAsignado(ticket)
  );
}
