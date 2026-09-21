import type { ITicketRepository } from '../../core/ports/repositories/ITicketRepository.js';
import type { IClock } from '../../core/ports/services/IClock.js';
import type { IIdGenerator } from '../../core/ports/services/IIdGenerator.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../../core/errors/DomainError.js';
import { Ticket } from '../../core/entities/Ticket.js';
import { registrarEvento } from './efectos.js';
import type { SessionUser } from '../shared/SessionUser.js';

/**
 * Caso de uso: mandar un ticket a la papelera o restaurarlo. Como en el CRM viejo, su folio no
 * se libera: mientras está en la papelera, un marcador "Ticket eliminado por administrador"
 * ocupa su lugar en la lista; al restaurarlo, el marcador se quita.
 */
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
    if (ticket.eliminadoPorAdmin) {
      throw new ValidationError('Este folio ya está marcado como eliminado; su ticket original está en la papelera.');
    }

    const ahora = this.clock.now();
    if (input.archivar) ticket.archivar(ahora);
    else ticket.restaurar(ahora);
    await this.tickets.save(ticket);
    if (input.archivar) await this.tickets.save(Ticket.marcadorDe(ticket, ahora));
    else if (await this.tickets.findById(Ticket.idMarcador(ticket.id))) {
      await this.tickets.eliminar(Ticket.idMarcador(ticket.id));
    }
    await registrarEvento(this.tickets, this.ids, ticket.id, {
      tipo: 'nota',
      resumen: input.archivar ? 'Enviado a la papelera' : 'Restaurado de la papelera',
      actor: input.actor,
      at: ahora,
    });
  }
}
