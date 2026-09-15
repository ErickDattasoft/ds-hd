import type { ITicketRepository } from '../../core/ports/repositories/ITicketRepository.js';
import type { IConfiguracionRepository } from '../../core/ports/repositories/IConfiguracionRepository.js';
import type { IClock } from '../../core/ports/services/IClock.js';
import type { IIdGenerator } from '../../core/ports/services/IIdGenerator.js';
import type { IWebhookPublisher } from '../../core/ports/services/IWebhookPublisher.js';
import type { IEmailSender } from '../../core/ports/services/IEmailSender.js';
import {
  ETIQUETAS_FACTURACION,
  esFacturacionCompletada,
  type EstadoFacturacion,
} from '../../core/entities/value-objects/EstadoFacturacion.js';
import { ForbiddenError, NotFoundError } from '../../core/errors/DomainError.js';
import { registrarEvento } from './efectos.js';
import { avisarSiQuedoCerradoYFacturado } from './cerradoFacturado.js';
import type { SessionUser } from '../shared/SessionUser.js';

/** Caso de uso: cambiar el estado de facturación de un ticket (catálogo fijo). */
export class MarcarFacturacionService {
  constructor(
    private readonly tickets: ITicketRepository,
    private readonly config: IConfiguracionRepository,
    private readonly ids: IIdGenerator,
    private readonly clock: IClock,
    private readonly webhooks: IWebhookPublisher,
    private readonly email: IEmailSender,
  ) {}

  async ejecutar(input: { actor: SessionUser; ticketId: string; estado: EstadoFacturacion }): Promise<void> {
    if (!input.actor.permisos.includes('tickets:editar')) {
      throw new ForbiddenError('No puedes editar tickets');
    }
    const ticket = await this.tickets.findById(input.ticketId);
    if (!ticket) throw new NotFoundError('Ticket', input.ticketId);

    const anterior = ticket.facturacion.estado;
    if (anterior === input.estado) return;

    const ahora = this.clock.now();
    const cumpliaAntes = ticket.esCerrado && esFacturacionCompletada(anterior);
    ticket.cambiarEstadoFacturacion(input.estado, ahora);
    await this.tickets.save(ticket);
    await registrarEvento(this.tickets, this.ids, ticket.id, {
      tipo: 'facturacion',
      resumen: `Facturación: ${ETIQUETAS_FACTURACION[anterior]} → ${ETIQUETAS_FACTURACION[input.estado]}`,
      actor: input.actor,
      at: ahora,
    });

    if (esFacturacionCompletada(input.estado) && !esFacturacionCompletada(anterior)) {
      await this.webhooks.publicar({
        evento: 'ticket.facturado',
        canal: 'tickets',
        payload: { id: ticket.id, numero: ticket.numero, tipo: ticket.tipo, empresaId: ticket.empresaId },
      });
    }

    const cfg = await this.config.obtenerTickets();
    await avisarSiQuedoCerradoYFacturado({
      tickets: this.tickets,
      ids: this.ids,
      webhooks: this.webhooks,
      email: this.email,
      correosNotificacion: cfg.correosNotificacion,
      ticket,
      cumpliaAntes,
      cumpleAhora: ticket.esCerrado && esFacturacionCompletada(input.estado),
      ahora,
    });
  }
}
