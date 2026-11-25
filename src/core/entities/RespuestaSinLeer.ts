/**
 * Respuesta de un cliente pendiente de leer (`respuestas_sin_leer/{ticketId}`). Es el «🔔 buzón»
 * del CRM: una por ticket (la última respuesta pisa a la anterior). Se lleva **por persona**: al
 * abrir el ticket se anota en `leidaPor` y deja de contar solo para quien lo abrió; los demás la
 * siguen viendo. Se borra cuando alguien del equipo le contesta al cliente, o sola a los
 * {@link DIAS_RESPUESTA_SIN_LEER} días.
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
  /** Distribuidor del ticket (para que la gente de otro distribuidor solo vea las suyas). */
  distribuidor: string;
  /** Quiénes del equipo ya la leyeron (abrieron el ticket después de que llegó). */
  leidaPor?: { uid: string; nombre: string }[];
}

/** Días que un aviso se queda en el buzón aunque no lo lea todo el equipo. */
export const DIAS_RESPUESTA_SIN_LEER = 15;

/** Largo máximo del extracto del mensaje. */
export const MAX_EXTRACTO_RESPUESTA = 160;
