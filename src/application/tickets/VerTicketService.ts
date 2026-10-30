import type { ITicketRepository } from '../../core/ports/repositories/ITicketRepository.js';
import type { IConfiguracionRepository } from '../../core/ports/repositories/IConfiguracionRepository.js';
import type { IAdjuntoTicketRepository } from '../../core/ports/repositories/IAdjuntoTicketRepository.js';
import type { Ticket } from '../../core/entities/Ticket.js';
import type { EventoTicket, NotaTicket } from '../../core/entities/NotaTicket.js';
import type { AdjuntoTicketMeta } from '../../core/entities/AdjuntoTicket.js';
import type { ConfiguracionTickets } from '../../core/entities/ConfiguracionTickets.js';
import { ForbiddenError, NotFoundError } from '../../core/errors/DomainError.js';
import type { SessionUser } from '../shared/SessionUser.js';
import { resolverImagenesDescripcion } from './descripcionImagenes.js';
import { ticketVisiblePara } from './alcance.js';

/** Ticket con sus notas/eventos/adjuntos y los permisos del actor ya resueltos para la vista. */
export interface DetalleTicket {
  ticket: Ticket;
  notas: NotaTicket[];
  /** Todas las notas, internas incluidas (lo que cuenta `contarNotas`). */
  notasTotal: number;
  eventos: EventoTicket[];
  adjuntos: AdjuntoTicketMeta[];
  config: ConfiguracionTickets;
  puedeEditar: boolean;
  puedeAsignar: boolean;
  puedeCambiarEstado: boolean;
  /** `ticket.descripcion` con las imágenes ya resueltas (`data-adj-id` → `src` real) — lista para pintar. */
  descripcionHtml: string;
}

/** Caso de uso: cargar el detalle de un ticket para el back-office (notas internas filtradas). */
export class VerTicketService {
  constructor(
    private readonly tickets: ITicketRepository,
    private readonly config: IConfiguracionRepository,
    private readonly adjuntos: IAdjuntoTicketRepository,
  ) {}

  /**
   * Cuántas notas tiene el ticket, para que el chat abierto se actualice solo: 2 lecturas
   * (el ticket, para el permiso, y un conteo) en vez de todo el detalle.
   */
  async contarNotas(actor: SessionUser, ticketId: string): Promise<number> {
    const ticket = await this.tickets.findById(ticketId);
    if (!ticket) throw new NotFoundError('Ticket', ticketId);
    if (!ticketVisiblePara(ticket, actor)) throw new ForbiddenError('Solo puedes ver tickets asignados a ti');
    return this.tickets.contarNotas(ticketId);
  }

  async ejecutar(actor: SessionUser, ticketId: string): Promise<DetalleTicket> {
    const ticket = await this.tickets.findById(ticketId);
    if (!ticket) throw new NotFoundError('Ticket', ticketId);

    if (!ticketVisiblePara(ticket, actor)) {
      throw new ForbiddenError('Solo puedes ver tickets asignados a ti');
    }

    const [notasTodas, eventos, adjuntos, config] = await Promise.all([
      this.tickets.listarNotas(ticketId),
      this.tickets.listarEventos(ticketId),
      this.adjuntos.listarPorTicket(ticketId),
      this.config.obtenerTickets(),
    ]);

    const verInternas = actor.permisos.includes('tickets:ver_notas_internas');
    const notas = verInternas ? notasTodas : notasTodas.filter((n) => n.tipo === 'publica');
    const descripcionHtml = await resolverImagenesDescripcion(ticket.descripcion, ticket.id, this.adjuntos);

    return {
      notasTotal: notasTodas.length,
      ticket,
      notas,
      eventos,
      adjuntos,
      config,
      descripcionHtml,
      puedeEditar: actor.permisos.includes('tickets:editar'),
      puedeAsignar: actor.permisos.includes('tickets:asignar'),
      puedeCambiarEstado:
        actor.permisos.includes('tickets:cambiar_estado'),
    };
  }
}
