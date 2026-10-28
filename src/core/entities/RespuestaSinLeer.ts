/**
 * Respuesta de un cliente que nadie del equipo ha visto todavía (`respuestas_sin_leer/{ticketId}`).
 * Es el «🔔 buzón» del CRM: una por ticket (la última respuesta pisa a la anterior) y se borra en
 * cuanto alguien del equipo abre el ticket.
 *
 * Guarda una copia de los campos de asignación del ticket para filtrar por alcance de agente sin
 * tener que leer cada ticket en cada página.
 */
export interface RespuestaSinLeer {
  ticketId: string;
  numero: number;
  asunto: string;
  empresaNombre: string | null;
  /** Quién respondió (nombre o correo). */
  autorNombre: string;
  /** Inicio del mensaje, para el listado. */
  extracto: string;
  at: Date;
  agenteAsignadoUid: string | null;
  agenteAsignadoNombre: string | null;
  canalizadoA: string | null;
}

/** Largo máximo del extracto del mensaje. */
export const MAX_EXTRACTO_RESPUESTA = 160;
