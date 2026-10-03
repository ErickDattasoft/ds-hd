import { equipoWhatsApp } from '../../core/entities/ConfiguracionIntegraciones.js';
import type { ITicketQueries, FiltroTickets } from '../../core/ports/repositories/ITicketQueries.js';
import type { IConfiguracionRepository } from '../../core/ports/repositories/IConfiguracionRepository.js';
import type { Ticket } from '../../core/entities/Ticket.js';
import type { ColumnaKanban } from '../../core/ports/repositories/ITicketQueries.js';
import type { ConfiguracionTickets } from '../../core/entities/ConfiguracionTickets.js';
import type { SessionUser } from '../shared/SessionUser.js';
import { alcanceTickets } from './alcance.js';

/** Caso de uso: listar / tablero de tickets del back-office, respetando el alcance del rol. */
export class ListarTicketsService {
  constructor(
    private readonly queries: ITicketQueries,
    private readonly config: IConfiguracionRepository,
  ) {}

  /** Aplica el alcance del actor: sin `tickets:leer_todos`, los suyos más los sin asignar. */
  private acotar(actor: SessionUser, filtro: FiltroTickets): FiltroTickets {
    return { ...filtro, ...alcanceTickets(actor) };
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

  /**
   * Conteo global por estado, sin importar el filtro de la vista (búsqueda/prioridad/etc.) —
   * para el resumen de arriba de la lista ("51 total, 2 abiertos, ..."). Respeta el alcance del
   * actor (un agente sin `tickets:leer_todos` solo cuenta los suyos) y excluye la papelera.
   */
  /** Nombres del equipo que puede recibir el recordatorio por WhatsApp de un ticket programado. */
  async equipoRecordatorio(): Promise<string[]> {
    const integ = await this.config.obtenerIntegraciones();
    return equipoWhatsApp(integ).map((d) => d.nombre);
  }

  /** Cuántos tickets hay en la papelera (contador del botón 🗑️ del listado). */
  contarEnPapelera(actor: SessionUser): Promise<number> {
    return this.queries.contar(this.acotar(actor, { archivado: true }));
  }

  async resumenPorEstado(actor: SessionUser): Promise<{ total: number; porEstado: Record<string, number> }> {
    const base = this.acotar(actor, { archivado: false });
    const config = await this.config.obtenerTickets();
    const [total, ...conteos] = await Promise.all([
      this.queries.contar(base),
      ...config.estados.map((estado) => this.queries.contar({ ...base, estado })),
    ]);
    const porEstado: Record<string, number> = {};
    config.estados.forEach((estado, i) => {
      porEstado[estado] = conteos[i] ?? 0;
    });
    return { total, porEstado };
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
