import type { ITicketQueries, FiltroTickets } from '../../core/ports/repositories/ITicketQueries.js';
import type { IConfiguracionRepository } from '../../core/ports/repositories/IConfiguracionRepository.js';
import type { Ticket } from '../../core/entities/Ticket.js';
import type { ColumnaKanban } from '../../core/ports/repositories/ITicketQueries.js';
import type { ConfiguracionTickets } from '../../core/entities/ConfiguracionTickets.js';
import type { SessionUser } from '../shared/SessionUser.js';

/** Caso de uso: listar / tablero de tickets del back-office, respetando el alcance del rol. */
export class ListarTicketsService {
  constructor(
    private readonly queries: ITicketQueries,
    private readonly config: IConfiguracionRepository,
  ) {}

  /** Aplica el alcance del actor: sin `tickets:leer_todos`, un agente solo ve los suyos. */
  private acotar(actor: SessionUser, filtro: FiltroTickets): FiltroTickets {
    if (actor.permisos.includes('tickets:leer_todos')) return filtro;
    return { ...filtro, agenteAsignadoUid: actor.uid };
  }

  async listar(
    actor: SessionUser,
    filtro: FiltroTickets,
  ): Promise<{ tickets: Ticket[]; total: number; config: ConfiguracionTickets }> {
    const f = this.acotar(actor, filtro);
    const [tickets, total, config] = await Promise.all([
      this.queries.listar(f),
      this.queries.contar(f),
      this.config.obtenerTickets(),
    ]);
    return { tickets, total, config };
  }

  async tablero(
    actor: SessionUser,
    filtro: FiltroTickets,
  ): Promise<{ columnas: ColumnaKanban[]; config: ConfiguracionTickets }> {
    const config = await this.config.obtenerTickets();
    const columnas = await this.queries.tablero(this.acotar(actor, filtro), config.estados);
    return { columnas, config };
  }
}
