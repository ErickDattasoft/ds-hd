import type { ITicketRepository } from '../../core/ports/repositories/ITicketRepository.js';
import type { IClock } from '../../core/ports/services/IClock.js';
import type { IIdGenerator } from '../../core/ports/services/IIdGenerator.js';
import type { ILogger } from '../../core/ports/services/ILogger.js';
import type { IEmailSender } from '../../core/ports/services/IEmailSender.js';
import type { NotaTicket } from '../../core/entities/NotaTicket.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../../core/errors/DomainError.js';
import { registrarEvento } from './efectos.js';
import type { RegistrarNotaInput } from './dto.js';

/** Caso de uso: agregar una nota (pública o interna) a un ticket. */
export class RegistrarNotaService {
  constructor(
    private readonly tickets: ITicketRepository,
    private readonly ids: IIdGenerator,
    private readonly clock: IClock,
    private readonly email: IEmailSender,
    private readonly logger: ILogger,
  ) {}

  async ejecutar(input: RegistrarNotaInput): Promise<NotaTicket> {
    const cuerpo = input.cuerpo.trim();
    if (cuerpo.length < 1) throw new ValidationError('La nota está vacía', { cuerpo: 'Requerida' });

    if (input.tipo === 'interna' && !input.actor.permisos.includes('tickets:ver_notas_internas')) {
      throw new ForbiddenError('No puedes escribir notas internas');
    }
    if (!input.actor.permisos.includes('tickets:editar') && !input.actor.esCliente) {
      throw new ForbiddenError('No puedes escribir en tickets');
    }

    const ticket = await this.tickets.findById(input.ticketId);
    if (!ticket) throw new NotFoundError('Ticket', input.ticketId);

    if (
      input.actor.esStaff &&
      !input.actor.permisos.includes('tickets:leer_todos') &&
      ticket.agenteAsignadoUid !== input.actor.uid
    ) {
      throw new ForbiddenError('Solo puedes escribir en tickets asignados a ti');
    }

    const ahora = this.clock.now();
    const nota: NotaTicket = {
      id: this.ids.newId(),
      tipo: input.tipo,
      cuerpo,
      autorUid: input.actor.uid,
      autorNombre: input.actor.nombre,
      createdAt: ahora,
    };
    await this.tickets.agregarNota(ticket.id, nota);
    await registrarEvento(this.tickets, this.ids, ticket.id, {
      tipo: 'nota',
      resumen: `Nota ${input.tipo} de ${input.actor.nombre}`,
      actor: input.actor,
      at: ahora,
    });

    if (input.actor.esStaff) {
      ticket.registrarPrimeraRespuesta(ahora);
      await this.tickets.save(ticket);
    }

    if (nota.tipo === 'publica' && input.actor.esStaff && ticket.contactoCorreo) {
      await this.email.enviar({
        para: [{ email: ticket.contactoCorreo, ...(ticket.contactoNombre ? { nombre: ticket.contactoNombre } : {}) }],
        asunto: `Actualización de tu ticket #${ticket.numero}`,
        html: `<p>${cuerpo}</p><hr /><p class="muted">Ticket #${ticket.numero} — ${ticket.asunto}</p>`,
        tags: ['ticket-nota', `ticket-${ticket.numero}`],
      });
    }

    this.logger.info('Nota registrada', { numero: ticket.numero, tipo: input.tipo, por: input.actor.uid });
    return nota;
  }
}
