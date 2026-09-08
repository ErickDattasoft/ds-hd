import type { ITicketRepository } from '../../core/ports/repositories/ITicketRepository.js';
import type { IConfiguracionRepository } from '../../core/ports/repositories/IConfiguracionRepository.js';
import type { IUsuarioRepository } from '../../core/ports/repositories/IUsuarioRepository.js';
import type { IClock } from '../../core/ports/services/IClock.js';
import type { IIdGenerator } from '../../core/ports/services/IIdGenerator.js';
import type { IEmailSender } from '../../core/ports/services/IEmailSender.js';
import type { ILogger } from '../../core/ports/services/ILogger.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../../core/errors/DomainError.js';
import { registrarEvento } from './efectos.js';
import { destinatariosTicket, resumenTicketHtml } from './notificacionTicket.js';
import type { SessionUser } from '../shared/SessionUser.js';

/** Datos para reenviar el correo de un ticket. */
export interface ReenviarCorreoInput {
  actor: SessionUser;
  ticketId: string;
}

/** Caso de uso: reenviar al cliente el correo con el resumen actual del ticket. */
export class ReenviarCorreoTicketService {
  constructor(
    private readonly tickets: ITicketRepository,
    private readonly config: IConfiguracionRepository,
    private readonly usuarios: IUsuarioRepository,
    private readonly ids: IIdGenerator,
    private readonly clock: IClock,
    private readonly email: IEmailSender,
    private readonly logger: ILogger,
  ) {}

  async ejecutar(input: ReenviarCorreoInput): Promise<{ enviadoA: string[] }> {
    if (!input.actor.permisos.includes('tickets:editar')) {
      throw new ForbiddenError('No puedes reenviar correos de tickets');
    }

    const ticket = await this.tickets.findById(input.ticketId);
    if (!ticket) throw new NotFoundError('Ticket', input.ticketId);

    if (
      !input.actor.permisos.includes('tickets:leer_todos') &&
      ticket.agenteAsignadoUid !== input.actor.uid
    ) {
      throw new ForbiddenError('Solo puedes reenviar el correo de tickets asignados a ti');
    }

    const cfg = await this.config.obtenerTickets();
    const hayLista = cfg.correosNotificacion.some((e) => e.includes('@'));
    if (!ticket.contactoCorreo?.trim() && !hayLista) {
      throw new ValidationError(
        'El ticket no tiene correo de contacto y no hay correos de notificación configurados',
        { correo: 'Sin destinatarios' },
      );
    }

    const agente = ticket.agenteAsignadoUid
      ? await this.usuarios.findByUid(ticket.agenteAsignadoUid)
      : null;
    const dest = destinatariosTicket(
      ticket,
      cfg.correosNotificacion,
      agente?.email.value ?? input.actor.email,
    );

    const eventos = await this.tickets.listarEventos(ticket.id);
    const ahora = this.clock.now();
    await this.email.enviar({
      para: dest.para,
      ...(dest.cc.length ? { cc: dest.cc } : {}),
      ...(dest.responderA ? { responderA: dest.responderA } : {}),
      asunto: `[Ticket #${ticket.numero}] ${ticket.asunto}`,
      html: resumenTicketHtml(ticket, eventos, { reenvio: true, sinContacto: dest.sinContacto }),
      tags: ['ticket-reenvio', `ticket-${ticket.numero}`],
    });

    const enviadoA = dest.para.map((p) => p.email);
    await registrarEvento(this.tickets, this.ids, ticket.id, {
      tipo: 'correo',
      resumen: `Reenvío de correo a ${enviadoA.join(', ')}`,
      actor: input.actor,
      at: ahora,
    });
    this.logger.info('Correo de ticket reenviado', {
      numero: ticket.numero,
      a: enviadoA,
      por: input.actor.uid,
    });
    return { enviadoA };
  }
}
