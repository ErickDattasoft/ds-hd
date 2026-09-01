import type { ITicketRepository } from '../../core/ports/repositories/ITicketRepository.js';
import type { IClock } from '../../core/ports/services/IClock.js';
import type { IIdGenerator } from '../../core/ports/services/IIdGenerator.js';
import type { IWebhookPublisher } from '../../core/ports/services/IWebhookPublisher.js';
import { ForbiddenError, NotFoundError } from '../../core/errors/DomainError.js';
import { registrarEvento } from './efectos.js';
import type { SessionUser } from '../shared/SessionUser.js';

/** Caso de uso: marcar/desmarcar un ticket como facturado. */
export class MarcarFacturacionService {
  constructor(
    private readonly tickets: ITicketRepository,
    private readonly ids: IIdGenerator,
    private readonly clock: IClock,
    private readonly webhooks: IWebhookPublisher,
  ) {}

  async ejecutar(input: { actor: SessionUser; ticketId: string; facturado: boolean }): Promise<void> {
    if (!input.actor.permisos.includes('tickets:editar')) {
      throw new ForbiddenError('No puedes editar tickets');
    }
    const ticket = await this.tickets.findById(input.ticketId);
    if (!ticket) throw new NotFoundError('Ticket', input.ticketId);

    const ahora = this.clock.now();
    ticket.marcarFacturado(input.facturado, ahora);
    await this.tickets.save(ticket);
    await registrarEvento(this.tickets, this.ids, ticket.id, {
      tipo: 'facturacion',
      resumen: input.facturado ? 'Marcado como facturado' : 'Facturación revertida',
      actor: input.actor,
      at: ahora,
    });

    if (input.facturado) {
      await this.webhooks.publicar({
        evento: 'ticket.facturado',
        canal: 'tickets',
        payload: { id: ticket.id, numero: ticket.numero, tipo: ticket.tipo, empresaId: ticket.empresaId },
      });
    }
  }
}
