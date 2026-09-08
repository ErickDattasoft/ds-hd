import type { ITicketRepository } from '../../core/ports/repositories/ITicketRepository.js';
import type { IConfiguracionRepository } from '../../core/ports/repositories/IConfiguracionRepository.js';
import type { IUsuarioRepository } from '../../core/ports/repositories/IUsuarioRepository.js';
import type { IClock } from '../../core/ports/services/IClock.js';
import type { IIdGenerator } from '../../core/ports/services/IIdGenerator.js';
import type { ILogger } from '../../core/ports/services/ILogger.js';
import type { IEmailSender } from '../../core/ports/services/IEmailSender.js';
import type { IWebhookPublisher } from '../../core/ports/services/IWebhookPublisher.js';
import type { Ticket } from '../../core/entities/Ticket.js';
import { ForbiddenError, NotFoundError } from '../../core/errors/DomainError.js';
import { registrarEvento } from './efectos.js';
import { historialActividadHtml } from './historialCorreo.js';
import { destinatariosTicket } from './notificacionTicket.js';
import type { CambiarEstadoInput } from './dto.js';

/**
 * Caso de uso: cambiar el estado de un ticket, con los efectos colaterales del ciclo de vida
 * (primera respuesta, correos y webhooks de resuelto/cerrado).
 */
export class ActualizarEstadoTicketService {
  constructor(
    private readonly tickets: ITicketRepository,
    private readonly config: IConfiguracionRepository,
    private readonly usuarios: IUsuarioRepository,
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
      await this.notificarCierre(ticket, resultado.quedoCerrado ? 'cerrado' : 'resuelto', input, ahora);
    }

    this.logger.info('Estado de ticket actualizado', {
      numero: ticket.numero,
      de: resultado.anterior,
      a: resultado.nuevo,
      por: input.actor.uid,
    });
    return ticket;
  }

  /** Correo del agente asignado para la copia interna; si no hay agente, el de quien actúa. */
  private async emailAgenteOActor(ticket: Ticket, emailActor: string): Promise<string> {
    if (!ticket.agenteAsignadoUid) return emailActor;
    const agente = await this.usuarios.findByUid(ticket.agenteAsignadoUid);
    return agente?.email.value ?? emailActor;
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
    input: CambiarEstadoInput,
    ahora: Date,
  ): Promise<void> {
    await this.webhooks.publicar({
      evento: `ticket.${tipo}`,
      canal: 'tickets',
      payload: { id: ticket.id, numero: ticket.numero, tipo: ticket.tipo, empresaId: ticket.empresaId },
    });

    const cfg = await this.config.obtenerTickets();
    const copiaInterna = await this.emailAgenteOActor(ticket, input.actor.email);
    const dest = destinatariosTicket(ticket, cfg.correosNotificacion, copiaInterna);
    if (dest.para.length === 0) return;

    const historial = historialActividadHtml(await this.tickets.listarEventos(ticket.id), 'cliente');
    const avisoSinContacto = dest.sinContacto
      ? `<p style="background:#fef3c7;color:#92400e;padding:8px 12px;border-radius:6px">⚠️ El contacto del ticket no tiene correo — este aviso solo llegó al equipo.</p>`
      : '';
    await this.email.enviar({
      para: dest.para,
      ...(dest.cc.length ? { cc: dest.cc } : {}),
      ...(dest.responderA ? { responderA: dest.responderA } : {}),
      asunto: `Ticket #${ticket.numero} — ${tipo}`,
      html: `${avisoSinContacto}<p>El ticket <strong>#${ticket.numero} — ${ticket.asunto}</strong> fue marcado como <strong>${tipo}</strong>.</p>${historial}`,
      tags: [`ticket-${tipo}`, `ticket-${ticket.numero}`],
    });
    await registrarEvento(this.tickets, this.ids, ticket.id, {
      tipo: 'correo',
      resumen: `Correo de "${tipo}" enviado a ${dest.para.map((p) => p.email).join(', ')}`,
      actor: null,
      at: ahora,
    });
  }
}
