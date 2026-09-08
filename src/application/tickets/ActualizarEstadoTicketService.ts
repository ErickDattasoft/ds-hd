import type { ITicketRepository } from '../../core/ports/repositories/ITicketRepository.js';
import type { IConfiguracionRepository } from '../../core/ports/repositories/IConfiguracionRepository.js';
import type { IClock } from '../../core/ports/services/IClock.js';
import type { IIdGenerator } from '../../core/ports/services/IIdGenerator.js';
import type { ILogger } from '../../core/ports/services/ILogger.js';
import type { IEmailSender } from '../../core/ports/services/IEmailSender.js';
import type { IWebhookPublisher } from '../../core/ports/services/IWebhookPublisher.js';
import type { Ticket } from '../../core/entities/Ticket.js';
import { ForbiddenError, NotFoundError } from '../../core/errors/DomainError.js';
import { registrarEvento } from './efectos.js';
import { historialActividadHtml } from './historialCorreo.js';
import type { CambiarEstadoInput } from './dto.js';

/**
 * Caso de uso: cambiar el estado de un ticket, con los efectos colaterales del ciclo de vida
 * (primera respuesta, correos y webhooks de resuelto/cerrado).
 */
export class ActualizarEstadoTicketService {
  constructor(
    private readonly tickets: ITicketRepository,
    private readonly config: IConfiguracionRepository,
    private readonly ids: IIdGenerator,
    private readonly clock: IClock,
    private readonly email: IEmailSender,
    private readonly webhooks: IWebhookPublisher,
    private readonly logger: ILogger,
  ) {}

  async ejecutar(input: CambiarEstadoInput): Promise<Ticket> {
    const ticket = await this.tickets.findById(input.ticketId);
    if (!ticket) throw new NotFoundError('Ticket', input.ticketId);

    this.verificarPermiso(ticket, input);

    const cfg = await this.config.obtenerTickets();
    const ahora = this.clock.now();

    const resultado = ticket.cambiarEstado(input.nuevoEstado, cfg.estados, ahora);
    if (input.actor.esStaff) ticket.registrarPrimeraRespuesta(ahora);

    await this.tickets.save(ticket);
    await registrarEvento(this.tickets, this.ids, ticket.id, {
      tipo: 'cambio_estado',
      resumen: `Estado: ${resultado.anterior} → ${resultado.nuevo}`,
      actor: input.actor,
      at: ahora,
    });

    if (input.nota?.trim()) {
      await this.tickets.agregarNota(ticket.id, {
        id: this.ids.newId(),
        tipo: 'interna',
        cuerpo: input.nota.trim(),
        autorUid: input.actor.uid,
        autorNombre: input.actor.nombre,
        createdAt: ahora,
      });
    }

    if (resultado.quedoResuelto || resultado.quedoCerrado) {
      await this.notificarCierre(ticket, resultado.quedoCerrado ? 'cerrado' : 'resuelto', ahora);
    }

    this.logger.info('Estado de ticket actualizado', {
      numero: ticket.numero,
      de: resultado.anterior,
      a: resultado.nuevo,
      por: input.actor.uid,
    });
    return ticket;
  }

  private verificarPermiso(ticket: Ticket, input: CambiarEstadoInput): void {
    const puedeTodos = input.actor.permisos.includes('tickets:leer_todos');
    const esSuyo = ticket.agenteAsignadoUid === input.actor.uid;
    if (!input.actor.permisos.includes('tickets:cambiar_estado')) {
      throw new ForbiddenError('No puedes cambiar el estado de tickets');
    }
    if (!puedeTodos && !esSuyo) {
      throw new ForbiddenError('Solo puedes cambiar el estado de tickets asignados a ti');
    }
  }

  private async notificarCierre(
    ticket: Ticket,
    tipo: 'resuelto' | 'cerrado',
    ahora: Date,
  ): Promise<void> {
    await this.webhooks.publicar({
      evento: `ticket.${tipo}`,
      canal: 'tickets',
      payload: { id: ticket.id, numero: ticket.numero, tipo: ticket.tipo, empresaId: ticket.empresaId },
    });

    if (ticket.contactoCorreo) {
      const historial = historialActividadHtml(await this.tickets.listarEventos(ticket.id), 'cliente');
      await this.email.enviar({
        para: [{ email: ticket.contactoCorreo, ...(ticket.contactoNombre ? { nombre: ticket.contactoNombre } : {}) }],
        asunto: `Tu ticket #${ticket.numero} fue ${tipo}`,
        html: `<p>Hola,</p><p>Tu ticket <strong>#${ticket.numero} — ${ticket.asunto}</strong> fue marcado como <strong>${tipo}</strong>.</p>${historial}`,
        tags: [`ticket-${tipo}`, `ticket-${ticket.numero}`],
      });
      await registrarEvento(this.tickets, this.ids, ticket.id, {
        tipo: 'correo',
        resumen: `Correo de "${tipo}" enviado a ${ticket.contactoCorreo}`,
        actor: null,
        at: ahora,
      });
    }
  }
}
