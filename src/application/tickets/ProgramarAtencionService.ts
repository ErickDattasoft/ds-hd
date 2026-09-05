import type { ITicketRepository } from '../../core/ports/repositories/ITicketRepository.js';
import type { IClock } from '../../core/ports/services/IClock.js';
import type { IIdGenerator } from '../../core/ports/services/IIdGenerator.js';
import type { IWebhookPublisher } from '../../core/ports/services/IWebhookPublisher.js';
import { parseAgenda } from '../../core/entities/value-objects/AgendaTicket.js';
import { ForbiddenError, NotFoundError } from '../../core/errors/DomainError.js';
import { registrarEvento } from './efectos.js';
import type { ProgramarAtencionInput } from './dto.js';

/** Caso de uso: programar, reprogramar o cancelar la atención de un ticket ("📅 Agenda"). */
export class ProgramarAtencionService {
  constructor(
    private readonly tickets: ITicketRepository,
    private readonly ids: IIdGenerator,
    private readonly clock: IClock,
    private readonly webhooks: IWebhookPublisher,
  ) {}

  async ejecutar(input: ProgramarAtencionInput): Promise<void> {
    if (!input.actor.permisos.includes('tickets:editar')) {
      throw new ForbiddenError('No puedes editar tickets');
    }
    const ticket = await this.tickets.findById(input.ticketId);
    if (!ticket) throw new NotFoundError('Ticket', input.ticketId);

    const ahora = this.clock.now();
    const teniaAgenda = ticket.agenda !== null;
    const recordatorioAntes = ticket.agenda?.recordatorioWhatsapp ?? false;

    if (!input.fecha.trim()) {
      if (!teniaAgenda) return;
      ticket.cancelarAgenda(ahora);
      await this.tickets.save(ticket);
      await registrarEvento(this.tickets, this.ids, ticket.id, {
        tipo: 'agenda',
        resumen: 'Programación de atención cancelada',
        actor: input.actor,
        at: ahora,
      });
      if (recordatorioAntes) await this.publicar(ticket, 'cancelar');
      return;
    }

    const agenda = parseAgenda(input);
    ticket.programarAtencion(agenda, ahora);
    await this.tickets.save(ticket);
    await registrarEvento(this.tickets, this.ids, ticket.id, {
      tipo: 'agenda',
      resumen: `Atención programada para ${agenda.fecha} ${agenda.hora}`,
      actor: input.actor,
      at: ahora,
    });

    if (agenda.recordatorioWhatsapp) {
      await this.publicar(ticket, teniaAgenda ? 'reprogramar' : 'programar');
    } else if (recordatorioAntes) {
      await this.publicar(ticket, 'cancelar');
    }
  }

  private async publicar(
    ticket: NonNullable<Awaited<ReturnType<ITicketRepository['findById']>>>,
    accion: 'programar' | 'reprogramar' | 'cancelar',
  ): Promise<void> {
    await this.webhooks.publicar({
      evento: 'ticket.programado',
      canal: 'tickets',
      payload: {
        id: ticket.id,
        numero: ticket.numero,
        asunto: ticket.asunto,
        accion,
        fecha: ticket.agenda?.fecha ?? null,
        hora: ticket.agenda?.hora ?? null,
        fechaHoraIso: ticket.fechaHoraProgramada?.toISOString() ?? null,
        agenteAsignadoUid: ticket.agenteAsignadoUid,
      },
    });
  }
}
