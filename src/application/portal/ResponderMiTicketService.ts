import type { ITicketRepository } from '../../core/ports/repositories/ITicketRepository.js';
import type { IUsuarioRepository } from '../../core/ports/repositories/IUsuarioRepository.js';
import type { IClock } from '../../core/ports/services/IClock.js';
import type { IIdGenerator } from '../../core/ports/services/IIdGenerator.js';
import type { IEmailSender } from '../../core/ports/services/IEmailSender.js';
import type { ILogger } from '../../core/ports/services/ILogger.js';
import type { NotaTicket } from '../../core/entities/NotaTicket.js';
import { NotFoundError, ValidationError } from '../../core/errors/DomainError.js';
import { registrarEvento } from '../tickets/efectos.js';
import type { SessionUser } from '../shared/SessionUser.js';

/** Caso de uso: el cliente responde en su propio ticket (siempre nota pública). */
export class ResponderMiTicketService {
  constructor(
    private readonly tickets: ITicketRepository,
    private readonly usuarios: IUsuarioRepository,
    private readonly ids: IIdGenerator,
    private readonly clock: IClock,
    private readonly email: IEmailSender,
    private readonly logger: ILogger,
  ) {}

  async ejecutar(input: { actor: SessionUser; ticketId: string; cuerpo: string }): Promise<NotaTicket> {
    const cuerpo = input.cuerpo.trim();
    if (cuerpo.length < 1) throw new ValidationError('El mensaje está vacío', { cuerpo: 'Escribe algo' });

    const ticket = await this.tickets.findById(input.ticketId);
    if (!ticket || ticket.solicitanteUid !== input.actor.uid) {
      throw new NotFoundError('Ticket', input.ticketId);
    }

    const ahora = this.clock.now();
    const nota: NotaTicket = {
      id: this.ids.newId(),
      tipo: 'publica',
      cuerpo,
      autorUid: input.actor.uid,
      autorNombre: input.actor.nombre,
      createdAt: ahora,
    };
    await this.tickets.agregarNota(ticket.id, nota);
    await registrarEvento(this.tickets, this.ids, ticket.id, {
      tipo: 'nota',
      resumen: `Respuesta del cliente (${input.actor.nombre})`,
      actor: input.actor,
      at: ahora,
    });

    // Avisar al agente asignado (si lo hay) que el cliente respondió.
    if (ticket.agenteAsignadoUid) {
      const agente = await this.usuarios.findByUid(ticket.agenteAsignadoUid);
      if (agente) {
        await this.email.enviar({
          para: [{ email: agente.email.value, nombre: agente.nombre }],
          asunto: `El cliente respondió en el ticket #${ticket.numero}`,
          html: `<p>${cuerpo}</p><hr /><p class="muted">Ticket #${ticket.numero} — ${ticket.asunto}</p>`,
          tags: ['ticket-respuesta-cliente', `ticket-${ticket.numero}`],
        });
      }
    }

    this.logger.info('Cliente respondió en su ticket', { numero: ticket.numero, uid: input.actor.uid });
    return nota;
  }
}
