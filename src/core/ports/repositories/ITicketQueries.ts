import type { Ticket } from '../../entities/Ticket.js';

/** Filtros para listar/contar tickets. */
export interface FiltroTickets {
  estado?: string;
  prioridad?: string;
  grupo?: string;
  agenteAsignadoUid?: string;
  /** `true` = solo sin asignar. */
  sinAsignar?: boolean;
  empresaId?: string;
  solicitanteUid?: string;
  canal?: string;
  /** Excluye estados finales (resuelto/cerrado). */
  soloAbiertos?: boolean;
  texto?: string;
  limite?: number;
  /** `false` (por defecto en las vistas normales) excluye tickets en la papelera. */
  archivado?: boolean;
}

/** Carga de trabajo de un agente para el panel de asignación. */
export interface CargaAgente {
  agenteUid: string;
  agenteNombre: string;
  grupo: string | null;
  capacidadMax: number;
  disponibleAsignacion: boolean;
  abiertos: number;
  vencidos: number;
}

/** Columna del tablero kanban. */
export interface ColumnaKanban {
  estado: string;
  tickets: Ticket[];
}

/** Lado consulta (lectura) de tickets: listados, tablero y agregados. */
export interface ITicketQueries {
  listar(filtro: FiltroTickets): Promise<Ticket[]>;
  contar(filtro: FiltroTickets): Promise<number>;
  tablero(filtro: FiltroTickets, estados: readonly string[]): Promise<ColumnaKanban[]>;
  cargaPorAgente(agentes: { uid: string; nombre: string; grupo: string | null; capacidadMax: number; disponibleAsignacion: boolean }[], ahora: Date): Promise<CargaAgente[]>;
}
