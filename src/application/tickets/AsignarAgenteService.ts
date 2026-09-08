import type { ITicketRepository } from '../../core/ports/repositories/ITicketRepository.js';
import type { ITicketQueries } from '../../core/ports/repositories/ITicketQueries.js';
import type { IUsuarioRepository } from '../../core/ports/repositories/IUsuarioRepository.js';
import type { IClock } from '../../core/ports/services/IClock.js';
import type { IIdGenerator } from '../../core/ports/services/IIdGenerator.js';
import type { ILogger } from '../../core/ports/services/ILogger.js';
import type { IEmailSender } from '../../core/ports/services/IEmailSender.js';
import type { IWebhookPublisher } from '../../core/ports/services/IWebhookPublisher.js';
import type { Ticket } from '../../core/entities/Ticket.js';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../core/errors/DomainError.js';
import { registrarEvento } from './efectos.js';
import { historialActividadHtml } from './historialCorreo.js';
import type { AsignarAgenteInput } from './dto.js';

/** Caso de uso: asignar un ticket a un agente técnico, respetando su capacidad. */
export class AsignarAgenteService {
  constructor(
    private readonly tickets: ITicketRepository,
    private readonly queries: ITicketQueries,
    private readonly usuarios: IUsuarioRepository,
    private readonly ids: IIdGenerator,
    private readonly clock: IClock,
    private readonly email: IEmailSender,
    private readonly webhooks: IWebhookPublisher,
    private readonly logger: ILogger,
  ) {}

  async ejecutar(input: AsignarAgenteInput): Promise<Ticket> {
    if (!input.actor.permisos.includes('tickets:asignar')) {
      throw new ForbiddenError('No puedes asignar tickets');
    }

    const ticket = await this.tickets.findById(input.ticketId);
    if (!ticket) throw new NotFoundError('Ticket', input.ticketId);

    const agente = await this.usuarios.findByUid(input.agenteUid);
    if (!agente || !agente.esTecnico || !agente.activo) {
      throw new ValidationError('El usuario no es un agente activo', { agenteUid: 'No válido' });
    }

    if (!input.forzar && agente.agente.capacidadMax > 0) {
      const abiertos = await this.queries.contar({
        agenteAsignadoUid: agente.uid,
        soloAbiertos: true,
      });
      if (abiertos >= agente.agente.capacidadMax) {
        throw new ConflictError(
          `${agente.nombre} ya tiene ${abiertos} tickets abiertos (capacidad ${agente.agente.capacidadMax}). Marca "forzar" para asignar de todos modos.`,
        );
      }
    }

    const ahora = this.clock.now();
    ticket.asignar(agente.uid, agente.nombre, ahora);
    await this.tickets.save(ticket);

    await registrarEvento(this.tickets, this.ids, ticket.id, {
      tipo: 'asignacion',
      resumen: `Asignado a ${agente.nombre}`,
      actor: input.actor,
      at: ahora,
    });

    await this.webhooks.publicar({
      evento: 'ticket.asignado',
      canal: 'tickets',
      payload: { id: ticket.id, numero: ticket.numero, agenteUid: agente.uid, agenteNombre: agente.nombre },
    });

    const historial = historialActividadHtml(await this.tickets.listarEventos(ticket.id), 'interno');
    await this.email.enviar({
      para: [{ email: agente.email.value, nombre: agente.nombre }],
      asunto: `Ticket #${ticket.numero} asignado a ti`,
      html: `<p>Se te asignó el ticket <strong>#${ticket.numero} — ${ticket.asunto}</strong> (prioridad ${ticket.prioridad}).</p>${historial}`,
      tags: ['ticket-asignado', `ticket-${ticket.numero}`],
    });

    this.logger.info('Ticket asignado', { numero: ticket.numero, agente: agente.uid, por: input.actor.uid });
    return ticket;
  }
}
