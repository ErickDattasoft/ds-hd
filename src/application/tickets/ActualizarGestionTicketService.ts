import type { ITicketRepository } from '../../core/ports/repositories/ITicketRepository.js';
import type { IIdGenerator } from '../../core/ports/services/IIdGenerator.js';
import type { IClock } from '../../core/ports/services/IClock.js';
import type { ILogger } from '../../core/ports/services/ILogger.js';
import { ForbiddenError, NotFoundError } from '../../core/errors/DomainError.js';
import { registrarEvento } from './efectos.js';
import type { SessionUser } from '../shared/SessionUser.js';

/** Datos de gestión interna editables desde el detalle del ticket. */
export interface ActualizarGestionInput {
  actor: SessionUser;
  ticketId: string;
  solicitadoPor?: string;
  canalizadoA?: string;
  /** Solo se aplica si el actor puede ver notas internas. */
  notasInternas?: string;
}

/** Caso de uso: actualizar "solicitado por / canalizado a / notas internas" de un ticket. */
export class ActualizarGestionTicketService {
  constructor(
    private readonly tickets: ITicketRepository,
    private readonly ids: IIdGenerator,
    private readonly clock: IClock,
    private readonly logger: ILogger,
  ) {}

  async ejecutar(input: ActualizarGestionInput): Promise<void> {
    if (!input.actor.permisos.includes('tickets:editar')) {
      throw new ForbiddenError('No puedes editar tickets');
    }
    const ticket = await this.tickets.findById(input.ticketId);
    if (!ticket) throw new NotFoundError('Ticket', input.ticketId);
    if (
      !input.actor.permisos.includes('tickets:leer_todos') &&
      ticket.agenteAsignadoUid !== input.actor.uid
    ) {
      throw new ForbiddenError('Solo puedes editar tickets asignados a ti');
    }

    const puedeNotas = input.actor.permisos.includes('tickets:ver_notas_internas');
    const ahora = this.clock.now();
    ticket.actualizarGestion(
      {
        ...(input.solicitadoPor !== undefined ? { solicitadoPor: input.solicitadoPor } : {}),
        ...(input.canalizadoA !== undefined ? { canalizadoA: input.canalizadoA } : {}),
        ...(puedeNotas && input.notasInternas !== undefined
          ? { notasInternas: input.notasInternas }
          : {}),
      },
      ahora,
    );
    await this.tickets.save(ticket);
    await registrarEvento(this.tickets, this.ids, ticket.id, {
      tipo: 'nota',
      resumen: 'Actualizó datos de gestión (solicitado / canalizado / notas internas)',
      actor: input.actor,
      at: ahora,
    });
    this.logger.info('Gestión de ticket actualizada', {
      numero: ticket.numero,
      por: input.actor.uid,
    });
  }
}
