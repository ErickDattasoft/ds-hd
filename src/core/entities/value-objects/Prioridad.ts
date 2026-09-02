import { ValidationError } from '../../errors/DomainError.js';

export const PRIORIDADES = ['Baja', 'Media', 'Alta', 'Urgente'] as const;
export type Prioridad = (typeof PRIORIDADES)[number];

/** Horas objetivo de resolución por prioridad (SLA por defecto; configurable en Configuración). */
export const SLA_HORAS_POR_DEFECTO: Record<Prioridad, number> = {
  Urgente: 4,
  Alta: 8,
  Media: 24,
  Baja: 72,
};

/** Type guard: ¿el valor es una de las prioridades válidas? */
export function esPrioridad(v: unknown): v is Prioridad {
  return typeof v === 'string' && (PRIORIDADES as readonly string[]).includes(v);
}

/** Valida y normaliza una prioridad recibida de un formulario o de la BD. */
export function parsePrioridad(v: unknown): Prioridad {
  if (!esPrioridad(v)) {
    throw new ValidationError(`Prioridad inválida: ${String(v)}`, { prioridad: 'No reconocida' });
  }
  return v;
}
