import type { ITicketRepository } from '../../core/ports/repositories/ITicketRepository.js';
import type { IClock } from '../../core/ports/services/IClock.js';
import type { IIdGenerator } from '../../core/ports/services/IIdGenerator.js';
import { ForbiddenError, NotFoundError } from '../../core/errors/DomainError.js';
import { registrarEvento } from './efectos.js';
import type { SessionUser } from '../shared/SessionUser.js';

/** Caso de uso: mandar un ticket a la papelera o restaurarlo. */
export class ArchivarTicketService {
  constructor(
    private readonly tickets: ITicketRepository,
    private readonly ids: IIdGenerator,
    private readonly clock: IClock,
  ) {}

  async ejecutar(input: { actor: SessionUser; ticketId: string; archivar: boolean }): Promise<void> {
    if (!input.actor.permisos.includes('tickets:eliminar')) {
      throw new ForbiddenError('No puedes archivar tickets');
    }
    const ticket = await this.tickets.findById(input.ticketId);
    if (!ticket) throw new NotFoundError('Ticket', input.ticketId);

    const ahora = this.clock.now();
    if (input.archivar) ticket.archivar(ahora);
    else ticket.restaurar(ahora);
    await this.tickets.save(ticket);
    await registrarEvento(this.tickets, this.ids, ticket.id, {
      tipo: 'nota',
      resumen: input.archivar ? 'Enviado a la papelera' : 'Restaurado de la papelera',
      actor: input.actor,
      at: ahora,
    });
  }
}
