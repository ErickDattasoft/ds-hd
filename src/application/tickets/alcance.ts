import { ticketDisponibleParaEquipo, ticketEsDeAgente, type Ticket } from '../../core/entities/Ticket.js';
import type { FiltroTickets } from '../../core/ports/repositories/ITicketQueries.js';
import type { SessionUser } from '../shared/SessionUser.js';

/** ¿El actor ve todos los tickets? (admin, supervisor, lectura…: tiene `tickets:leer_todos`). */
export function veTodosLosTickets(actor: SessionUser): boolean {
  return actor.permisos.includes('tickets:leer_todos');
}

/**
 * Filtro de alcance para listados/conteos: quien no ve todos ve los suyos (por uid o por nombre en
 * "Agente"/"Canalizado a") más los que nadie tiene todavía — si no, los sin asignar quedarían
 * invisibles para todo el equipo hasta que un admin los repartiera (igual que el CRM viejo). Un
 * ticket con un admin en "Agente" y sin canalizar también cuenta como «de nadie todavía».
 */
export function alcanceTickets(actor: SessionUser): Pick<FiltroTickets, 'alcanceAgente' | 'distribuidor'> {
  return {
    ...(veTodosLosTickets(actor)
      ? {}
      : { alcanceAgente: { uid: actor.uid, nombre: actor.nombre, admins: actor.adminsDelEquipo ?? [] } }),
    // Gente de otro distribuidor: solo lo suyo, aunque su rol vea todos los tickets.
    ...(actor.distribuidor ? { distribuidor: actor.distribuidor } : {}),
  };
}

/** Misma regla que {@link alcanceTickets}, para un ticket suelto (ver/editar/escribir). */
export function ticketVisiblePara(
  ticket: Pick<Ticket, 'agenteAsignadoUid' | 'agenteAsignadoNombre' | 'canalizadoA' | 'distribuidor'>,
  actor: SessionUser,
): boolean {
  if (actor.distribuidor && ticket.distribuidor !== actor.distribuidor) return false;
  return (
    veTodosLosTickets(actor) ||
    ticketEsDeAgente(ticket, { uid: actor.uid, nombre: actor.nombre }) ||
    ticketDisponibleParaEquipo(ticket, actor.adminsDelEquipo ?? [])
  );
}
