import type { ITicketRepository } from '../../core/ports/repositories/ITicketRepository.js';
import type { IConfiguracionRepository } from '../../core/ports/repositories/IConfiguracionRepository.js';
import type { IClock } from '../../core/ports/services/IClock.js';
import type { IIdGenerator } from '../../core/ports/services/IIdGenerator.js';
import type { IWebhookPublisher } from '../../core/ports/services/IWebhookPublisher.js';
import type { IEmailSender } from '../../core/ports/services/IEmailSender.js';
import {
  etiquetaFacturacion,
  esFacturacionCompletada,
  type EstadoFacturacion,
} from '../../core/entities/value-objects/EstadoFacturacion.js';
import { ForbiddenError, NotFoundError } from '../../core/errors/DomainError.js';
import { registrarEvento } from './efectos.js';
import { correosAvisoFacturado } from '../../core/entities/ConfiguracionTickets.js';
import { avisarSiQuedoCerradoYFacturado } from './cerradoFacturado.js';
import type { SessionUser } from '../shared/SessionUser.js';
import type { Ticket } from '../../core/entities/Ticket.js';

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

  async ejecutar(input: {
    actor: SessionUser;
    ticketId: string;
    estado: EstadoFacturacion;
    /** 🧾 Folio de la factura (vacío = quitarlo; sin mandar = no se toca). */
    folio?: string;
    /** ✉️ Mandarle al cliente un correo corto con el folio (solo a él, sin copias al equipo). */
    avisarFolio?: boolean;
  }): Promise<void> {
    if (!input.actor.permisos.includes('tickets:editar')) {
      throw new ForbiddenError('No puedes editar tickets');
    }
    const ticket = await this.tickets.findById(input.ticketId);
    if (!ticket) throw new NotFoundError('Ticket', input.ticketId);

    const anterior = ticket.facturacion.estado;
    const ahora = this.clock.now();
    const folioAntes = ticket.facturacion.folio ?? null;
    if (input.folio !== undefined) ticket.fijarFolioFactura(input.folio, ahora);
    const folio = ticket.facturacion.folio ?? null;
    if (folio !== folioAntes) {
      await this.tickets.save(ticket);
      await registrarEvento(this.tickets, this.ids, ticket.id, {
        tipo: 'facturacion',
        resumen: folio ? `🧾 Folio de factura: ${folio}` : '🧾 Se quitó el folio de factura',
        actor: input.actor,
        at: ahora,
      });
    }
    if (input.avisarFolio && folio) await this.mandarFolioAlCliente(ticket, folio, input.actor, ahora);
    if (anterior === input.estado) return;

    const cumpliaAntes = ticket.esCerrado && esFacturacionCompletada(anterior);
    ticket.cambiarEstadoFacturacion(input.estado, ahora);
    await this.tickets.save(ticket);
    await registrarEvento(this.tickets, this.ids, ticket.id, {
      tipo: 'facturacion',
      resumen: `Facturación: ${etiquetaFacturacion(anterior)} → ${etiquetaFacturacion(input.estado)}`,
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
      correosNotificacion: correosAvisoFacturado(cfg),
      ticket,
      cumpliaAntes,
      cumpleAhora: ticket.esCerrado && esFacturacionCompletada(input.estado),
      ahora,
    });
  }

  /** Un solo correo corto al cliente con el folio, sin copias al equipo (lo piden algunos clientes). */
  private async mandarFolioAlCliente(ticket: Ticket, folio: string, actor: SessionUser, ahora: Date): Promise<void> {
    const correo = ticket.contactoCorreo?.trim();
    if (!correo) return;
    const cfg = await this.config.obtenerTickets();
    const responder = cfg.correosNotificacion.map((c) => c.trim()).find((c) => c.includes('@'));
    const e = (t: string): string => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    await this.email.enviar({
      para: [{ email: correo, ...(ticket.contactoNombre ? { nombre: ticket.contactoNombre } : {}) }],
      ...(responder ? { responderA: { email: responder } } : {}),
      asunto: `[Ticket #${ticket.numero}] ${ticket.asunto} — Factura ${folio}`,
      html:
        `<p>Hola${ticket.contactoNombre ? ` ${e(ticket.contactoNombre)}` : ''},</p>` +
        `<p>La factura de tu ticket <strong>#${ticket.numero} — ${e(ticket.asunto)}</strong> es: <strong style="font-size:1.15em">🧾 ${e(folio)}</strong></p>` +
        `<p>Saludos.</p>`,
      tags: ['ticket-folio-factura', `ticket-${ticket.numero}`],
    });
    await registrarEvento(this.tickets, this.ids, ticket.id, {
      tipo: 'correo',
      resumen: `Correo con el folio de factura ${folio} enviado a ${correo}`,
      actor,
      at: ahora,
    });
  }
}
