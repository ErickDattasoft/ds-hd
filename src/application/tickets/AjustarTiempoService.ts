import type { ITicketRepository } from '../../core/ports/repositories/ITicketRepository.js';
import type { IClock } from '../../core/ports/services/IClock.js';
import type { IIdGenerator } from '../../core/ports/services/IIdGenerator.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../../core/errors/DomainError.js';
import { registrarEvento } from './efectos.js';
import type { SessionUser } from '../shared/SessionUser.js';

const duracionTexto = (ms: number): string => {
  const min = Math.round(ms / 60_000);
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

/** Caso de uso: ajustar manualmente el tiempo trabajado de un ticket (o quitar el ajuste). */
export class AjustarTiempoService {
  constructor(
    private readonly tickets: ITicketRepository,
    private readonly ids: IIdGenerator,
    private readonly clock: IClock,
  ) {}

  async ejecutar(input: {
    actor: SessionUser;
    ticketId: string;
    /** `true` = quitar el ajuste manual y volver al cálculo automático. */
    quitar: boolean;
    horas: number;
    minutos: number;
  }): Promise<void> {
    if (!input.actor.permisos.includes('tickets:editar')) {
      throw new ForbiddenError('No puedes editar tickets');
    }
    const ticket = await this.tickets.findById(input.ticketId);
    if (!ticket) throw new NotFoundError('Ticket', input.ticketId);

    const ahora = this.clock.now();

    if (input.quitar) {
      if (ticket.tiempoTrabajadoManualMs === null) return;
      ticket.ajustarTiempoManual(null, ahora);
      await this.tickets.save(ticket);
      await registrarEvento(this.tickets, this.ids, ticket.id, {
        tipo: 'nota',
        resumen: 'Ajuste manual de tiempo trabajado quitado (vuelve al automático)',
        actor: input.actor,
        at: ahora,
      });
      return;
    }

    const horas = Number.isFinite(input.horas) ? Math.max(0, Math.trunc(input.horas)) : 0;
    const minutos = Number.isFinite(input.minutos) ? Math.max(0, Math.trunc(input.minutos)) : 0;
    if (horas === 0 && minutos === 0) {
      throw new ValidationError('Indica al menos unos minutos de trabajo', {
        tiempoManual: 'Debe ser mayor que cero (o usa "quitar ajuste")',
      });
    }
    const ms = (horas * 60 + minutos) * 60_000;
    ticket.ajustarTiempoManual(ms, ahora);
    await this.tickets.save(ticket);
    await registrarEvento(this.tickets, this.ids, ticket.id, {
      tipo: 'nota',
      resumen: `Tiempo trabajado ajustado a mano: ${duracionTexto(ms)} (automático: ${duracionTexto(
        ticket.tiempoTrabajadoCalculadoMs(ahora),
      )})`,
      actor: input.actor,
      at: ahora,
    });
  }

  /** Agrega el tiempo trabajado (efectivo: manual si hay ajuste, si no el automático) al final
   *  de la descripción del ticket — útil antes de cerrarlo/imprimirlo, como en el CRM viejo. */
  async incluirEnDescripcion(actor: SessionUser, ticketId: string): Promise<void> {
    if (!actor.permisos.includes('tickets:editar')) {
      throw new ForbiddenError('No puedes editar tickets');
    }
    const ticket = await this.tickets.findById(ticketId);
    if (!ticket) throw new NotFoundError('Ticket', ticketId);
    const ahora = this.clock.now();
    ticket.agregarADescripcion(`⏱️ Tiempo trabajado: ${duracionTexto(ticket.tiempoTrabajadoEfectivoMs(ahora))}`);
    await this.tickets.save(ticket);
    await registrarEvento(this.tickets, this.ids, ticket.id, {
      tipo: 'nota',
      resumen: 'Tiempo trabajado incluido en la descripción',
      actor,
      at: ahora,
    });
  }
}
