import type { ITicketRepository } from '../../core/ports/repositories/ITicketRepository.js';
import type { IConfiguracionRepository } from '../../core/ports/repositories/IConfiguracionRepository.js';
import type { Ticket } from '../../core/entities/Ticket.js';
import type { EventoTicket, NotaTicket } from '../../core/entities/NotaTicket.js';
import type { ConfiguracionTickets } from '../../core/entities/ConfiguracionTickets.js';
import { ForbiddenError, NotFoundError } from '../../core/errors/DomainError.js';
import type { SessionUser } from '../shared/SessionUser.js';

export interface DetalleTicket {
  ticket: Ticket;
  notas: NotaTicket[];
  eventos: EventoTicket[];
  config: ConfiguracionTickets;
  puedeEditar: boolean;
  puedeAsignar: boolean;
  puedeCambiarEstado: boolean;
}

/** Caso de uso: cargar el detalle de un ticket para el back-office (notas internas filtradas). */
export class VerTicketService {
  constructor(
    private readonly tickets: ITicketRepository,
    private readonly config: IConfiguracionRepository,
  ) {}

  async ejecutar(actor: SessionUser, ticketId: string): Promise<DetalleTicket> {
    const ticket = await this.tickets.findById(ticketId);
    if (!ticket) throw new NotFoundError('Ticket', ticketId);

    const puedeTodos = actor.permisos.includes('tickets:leer_todos');
    const esSuyo = ticket.agenteAsignadoUid === actor.uid;
    if (!puedeTodos && !esSuyo) {
      throw new ForbiddenError('Solo puedes ver tickets asignados a ti');
    }

    const [notasTodas, eventos, config] = await Promise.all([
      this.tickets.listarNotas(ticketId),
      this.tickets.listarEventos(ticketId),
      this.config.obtenerTickets(),
    ]);

    const verInternas = actor.permisos.includes('tickets:ver_notas_internas');
    const notas = verInternas ? notasTodas : notasTodas.filter((n) => n.tipo === 'publica');

    return {
      ticket,
      notas,
      eventos,
      config,
      puedeEditar: actor.permisos.includes('tickets:editar') && (puedeTodos || esSuyo),
      puedeAsignar: actor.permisos.includes('tickets:asignar'),
      puedeCambiarEstado:
        actor.permisos.includes('tickets:cambiar_estado') && (puedeTodos || esSuyo),
    };
  }
}
