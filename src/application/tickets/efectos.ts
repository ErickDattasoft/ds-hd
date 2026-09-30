import type { ITicketRepository } from '../../core/ports/repositories/ITicketRepository.js';
import type { IIdGenerator } from '../../core/ports/services/IIdGenerator.js';
import type { EventoTicket } from '../../core/entities/NotaTicket.js';
import type { Ticket } from '../../core/entities/Ticket.js';
import type { IWebhookPublisher } from '../../core/ports/services/IWebhookPublisher.js';
import type { SessionUser } from '../shared/SessionUser.js';

/** Añade una entrada al registro de actividad del ticket. Helper compartido por los casos de uso. */
export async function registrarEvento(
  tickets: ITicketRepository,
  ids: IIdGenerator,
  ticketId: string,
  data: { tipo: EventoTicket['tipo']; resumen: string; actor: SessionUser | null; at: Date },
): Promise<void> {
  await tickets.registrarEvento(ticketId, {
    id: ids.newId(),
    tipo: data.tipo,
    resumen: data.resumen,
    actorUid: data.actor?.uid ?? null,
    actorNombre: data.actor?.nombre ?? null,
    at: data.at,
  });
}

/** Aviso «nota interna agregada» (n8n/WhatsApp del equipo), como `ticket_nota_interna` del viejo. */
export async function publicarNotaInterna(
  webhooks: IWebhookPublisher | undefined,
  ticket: Pick<Ticket, 'id' | 'numero' | 'asunto' | 'empresaNombre'>,
  nota: string,
  por: string,
): Promise<void> {
  if (!webhooks || !nota.trim()) return;
  await webhooks.publicar({
    evento: 'ticket.nota_interna',
    canal: 'tickets',
    payload: {
      id: ticket.id,
      numero: ticket.numero,
      asunto: ticket.asunto,
      empresaNombre: ticket.empresaNombre,
      nota: nota.trim(),
      por,
    },
  });
}
