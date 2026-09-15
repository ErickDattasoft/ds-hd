import type { ITicketRepository } from '../../core/ports/repositories/ITicketRepository.js';
import type { IIdGenerator } from '../../core/ports/services/IIdGenerator.js';
import type { IWebhookPublisher } from '../../core/ports/services/IWebhookPublisher.js';
import type { IEmailSender } from '../../core/ports/services/IEmailSender.js';
import type { Ticket } from '../../core/entities/Ticket.js';
import { registrarEvento } from './efectos.js';

/**
 * Correo interno + webhook `ticket.cerrado_facturado`: se dispara la primera vez que la
 * combinación (estado=Cerrado) Y (facturación completada) se cumple, sin importar cuál de
 * los dos cambió primero — paridad con el CRM viejo. Se llama tanto desde
 * `ActualizarEstadoTicketService` (cuando cambia el estado) como desde
 * `MarcarFacturacionService` (cuando cambia la facturación); cada uno calcula
 * `cumpliaAntes`/`cumpleAhora` con su propio "antes"/"después" del campo que está cambiando.
 */
export async function avisarSiQuedoCerradoYFacturado(input: {
  tickets: ITicketRepository;
  ids: IIdGenerator;
  webhooks: IWebhookPublisher;
  email: IEmailSender;
  correosNotificacion: string[];
  ticket: Ticket;
  cumpliaAntes: boolean;
  cumpleAhora: boolean;
  ahora: Date;
}): Promise<void> {
  if (!input.cumpleAhora || input.cumpliaAntes) return;
  const { ticket, ahora } = input;

  await input.webhooks.publicar({
    evento: 'ticket.cerrado_facturado',
    canal: 'tickets',
    payload: { id: ticket.id, numero: ticket.numero, tipo: ticket.tipo, empresaId: ticket.empresaId },
  });

  const para = input.correosNotificacion.map((email) => ({ email }));
  if (para.length) {
    await input.email.enviar({
      para,
      asunto: `✅ Ticket #${ticket.numero} cerrado${ticket.empresaNombre ? ` — ${ticket.empresaNombre}` : ''} [FACTURADO]`,
      html: `<p>El ticket <strong>#${ticket.numero} — ${ticket.asunto}</strong>${
        ticket.empresaNombre ? ` de <strong>${ticket.empresaNombre}</strong>` : ''
      } fue cerrado y marcado como <strong>FACTURADO</strong>.</p>`,
      tags: ['ticket-cerrado-facturado', `ticket-${ticket.numero}`],
    });
  }

  await registrarEvento(input.tickets, input.ids, ticket.id, {
    tipo: 'correo',
    resumen: `Ticket cerrado y FACTURADO — correo${para.length ? ' enviado' : ' no enviado (sin correo de soporte configurado)'}`,
    actor: null,
    at: ahora,
  });
}
