import type { ITicketRepository } from '../../core/ports/repositories/ITicketRepository.js';
import type { IBitacoraRepository } from '../../core/ports/repositories/IBitacoraRepository.js';
import type { IIdGenerator } from '../../core/ports/services/IIdGenerator.js';
import type { EventoTicket } from '../../core/entities/NotaTicket.js';

/** Los que no se copian: los genera el sistema solo y el viejo tampoco los anotaba. */
const SIN_BITACORA = new Set<EventoTicket['tipo']>(['sla_incumplido', 'encuesta']);

/**
 * Envuelve el repositorio de tickets para que cada evento de su actividad (creación, estado,
 * notas, adjuntos, correos, facturación, papelera…) quede también en la Bitácora general, como
 * hacía el CRM viejo con `logBitacora("Ticket #…")`. Best-effort: si la bitácora falla, el
 * evento del ticket ya quedó guardado y no se interrumpe nada.
 */
export function ticketRepoConBitacora(
  inner: ITicketRepository,
  bitacora: IBitacoraRepository,
  ids: IIdGenerator,
): ITicketRepository {
  return new Proxy(inner, {
    get(target, prop, receiver) {
      if (prop !== 'registrarEvento') {
        const v = Reflect.get(target, prop, receiver) as unknown;
        return typeof v === 'function' ? (v as (...a: unknown[]) => unknown).bind(target) : v;
      }
      return async (ticketId: string, evento: EventoTicket): Promise<void> => {
        await target.registrarEvento(ticketId, evento);
        if (SIN_BITACORA.has(evento.tipo)) return;
        try {
          const ticket = await target.findById(ticketId);
          const folio = ticket ? `Ticket #${ticket.numero}` : 'Ticket';
          await bitacora.registrar({
            id: ids.newId(),
            at: evento.at,
            actorUid: evento.actorUid,
            actorNombre: evento.actorNombre,
            accion: evento.tipo,
            modulo: 'tickets',
            entidadTipo: 'Ticket',
            entidadId: ticketId,
            resumen: evento.resumen.startsWith('Ticket #') ? evento.resumen : `${folio}: ${evento.resumen}`,
          });
        } catch {
          /* best-effort */
        }
      };
    },
  });
}
