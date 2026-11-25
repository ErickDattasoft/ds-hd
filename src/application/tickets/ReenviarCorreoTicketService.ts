import { avisaCliente, copiaAgenteSiQuiere, correosCopia } from '../../core/entities/ConfiguracionTickets.js';
import type { ITicketRepository } from '../../core/ports/repositories/ITicketRepository.js';
import type { IConfiguracionRepository } from '../../core/ports/repositories/IConfiguracionRepository.js';
import type { IUsuarioRepository } from '../../core/ports/repositories/IUsuarioRepository.js';
import type { IAdjuntoTicketRepository } from '../../core/ports/repositories/IAdjuntoTicketRepository.js';
import type { IClock } from '../../core/ports/services/IClock.js';
import type { IIdGenerator } from '../../core/ports/services/IIdGenerator.js';
import type { IEmailSender } from '../../core/ports/services/IEmailSender.js';
import type { ILogger } from '../../core/ports/services/ILogger.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../../core/errors/DomainError.js';
import { registrarEvento } from './efectos.js';
import { destinatariosTicket, resumenTicketHtml } from './notificacionTicket.js';
import type { SessionUser } from '../shared/SessionUser.js';
import { ticketVisiblePara } from './alcance.js';

/** Datos para reenviar el correo de un ticket. */
export interface ReenviarCorreoInput {
  actor: SessionUser;
  ticketId: string;
  /** `false` = correo al crear el ticket (casilla "Enviar correo al cliente"), no un reenvío. */
  esReenvio?: boolean;
  /** Solo a la lista de notificación y al agente (ticket creado sin «Enviar correo al cliente»):
   * el equipo se entera igual, pero el cliente no recibe nada. */
  soloEquipo?: boolean;
}

/** Caso de uso: reenviar al cliente el correo con el resumen actual del ticket. */
export class ReenviarCorreoTicketService {
  constructor(
    private readonly tickets: ITicketRepository,
    private readonly config: IConfiguracionRepository,
    private readonly usuarios: IUsuarioRepository,
    private readonly adjuntos: IAdjuntoTicketRepository,
    private readonly ids: IIdGenerator,
    private readonly clock: IClock,
    private readonly email: IEmailSender,
    private readonly logger: ILogger,
    private readonly baseUrl = '',
  ) {}

  async ejecutar(input: ReenviarCorreoInput): Promise<{ enviadoA: string[] }> {
    if (!input.actor.permisos.includes('tickets:editar')) {
      throw new ForbiddenError('No puedes reenviar correos de tickets');
    }

    const ticket = await this.tickets.findById(input.ticketId);
    if (!ticket) throw new NotFoundError('Ticket', input.ticketId);

    if (!ticketVisiblePara(ticket, input.actor)) {
      throw new ForbiddenError('Solo puedes reenviar el correo de tickets asignados a ti');
    }

    const cfg = await this.config.obtenerTickets();
    // 👤 Si en Configuración se apagó «🆕 Ticket nuevo» para el CLIENTE, el correo del ticket nuevo
    // solo va al equipo. Un reenvío a mano (botón ✉️ Reenviar correo) sí le llega.
    const soloEquipo = input.soloEquipo === true || (input.esReenvio === false && !avisaCliente(cfg, 'nuevo'));
    // Copias al equipo: solo quien eligió «🆕 Ticket nuevo» (Configuración → Tickets).
    const copias = correosCopia(cfg, 'nuevo');
    const hayLista = copias.length > 0;
    if (soloEquipo && !hayLista && !ticket.agenteAsignadoUid) return { enviadoA: [] };
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
      soloEquipo ? { contactoCorreo: null, contactoNombre: null } : ticket,
      copias,
      copiaAgenteSiQuiere(cfg, agente?.email.value ?? input.actor.email, 'nuevo'),
      cfg.correosNotificacion,
    );

    const [eventos, adjuntos] = await Promise.all([
      this.tickets.listarEventos(ticket.id),
      this.adjuntos.listarPorTicket(ticket.id),
    ]);
    const ahora = this.clock.now();
    await this.email.enviar({
      para: dest.para,
      ...(dest.cc.length ? { cc: dest.cc } : {}),
      ...(dest.cco.length ? { cco: dest.cco } : {}),
      ...(dest.responderA ? { responderA: dest.responderA } : {}),
      asunto: `[Ticket #${ticket.numero}] ${ticket.asunto}`,
      html: resumenTicketHtml(ticket, eventos, {
        reenvio: input.esReenvio !== false,
        sinContacto: dest.sinContacto,
        soloEquipo,
        adjuntos,
        baseUrl: this.baseUrl,
      }),
      tags: [input.esReenvio === false ? 'ticket-nuevo' : 'ticket-reenvio', `ticket-${ticket.numero}`],
    });

    const enviadoA = dest.para.map((p) => p.email);
    await registrarEvento(this.tickets, this.ids, ticket.id, {
      tipo: 'correo',
      resumen: `${soloEquipo ? 'Aviso al equipo del ticket nuevo (sin correo al cliente)' : input.esReenvio === false ? 'Correo del ticket nuevo' : 'Reenvío de correo'} a ${enviadoA.join(', ')}`,
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
