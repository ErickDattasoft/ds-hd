import type { ITicketQueries } from '../../core/ports/repositories/ITicketQueries.js';
import type { ITicketRepository } from '../../core/ports/repositories/ITicketRepository.js';
import type { IConfiguracionRepository } from '../../core/ports/repositories/IConfiguracionRepository.js';
import type { Ticket } from '../../core/entities/Ticket.js';
import type { EventoTicket, NotaTicket } from '../../core/entities/NotaTicket.js';
import { NotFoundError } from '../../core/errors/DomainError.js';
import type { ConfiguracionTickets } from '../../core/entities/ConfiguracionTickets.js';
import type { SessionUser } from '../shared/SessionUser.js';

export interface MiTicketDetalle {
  ticket: Ticket;
  /** SOLO notas públicas — el portal nunca muestra notas internas. */
  notas: NotaTicket[];
  /** Eventos "seguros" para el cliente (cambios de estado y respuestas). */
  eventos: EventoTicket[];
}

/**
 * Casos de uso de lectura del portal. Todas las consultas están acotadas a
 * `solicitanteUid === actor.uid`: un cliente jamás ve tickets de otro (ni de otro contacto
 * de su misma empresa).
 */
export class MisTicketsService {
  constructor(
    private readonly queries: ITicketQueries,
    private readonly tickets: ITicketRepository,
    private readonly config: IConfiguracionRepository,
  ) {}

  async listar(actor: SessionUser, incluirCerrados: boolean): Promise<Ticket[]> {
    return this.queries.listar({
      solicitanteUid: actor.uid,
      ...(incluirCerrados ? {} : { soloAbiertos: true }),
    });
  }

  async catalogoParaCrear(): Promise<ConfiguracionTickets> {
    return this.config.obtenerTickets();
  }

  async verDetalle(actor: SessionUser, ticketId: string): Promise<MiTicketDetalle> {
    const ticket = await this.tickets.findById(ticketId);
    // 404 (no 403) para no revelar la existencia de tickets ajenos.
    if (!ticket || ticket.solicitanteUid !== actor.uid) {
      throw new NotFoundError('Ticket', ticketId);
    }

    const [todasLasNotas, todosLosEventos] = await Promise.all([
      this.tickets.listarNotas(ticketId),
      this.tickets.listarEventos(ticketId),
    ]);

    return {
      ticket,
      notas: todasLasNotas.filter((n) => n.tipo === 'publica'),
      // Solo cambios de estado: los eventos de "nota" revelarían que existen notas internas.
      eventos: todosLosEventos.filter((e) => e.tipo === 'cambio_estado'),
    };
  }
}
