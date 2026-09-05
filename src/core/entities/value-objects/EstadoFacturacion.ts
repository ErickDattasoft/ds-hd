import { ValidationError } from '../../errors/DomainError.js';

/** Catálogo fijo de estados de facturación de un ticket (paridad exacta con el CRM viejo). */
export const ESTADOS_FACTURACION = [
  'no_facturado',
  'facturado',
  'no_aplica',
  'factura_mensual',
  'consulta_sin_costo',
] as const;

export type EstadoFacturacion = (typeof ESTADOS_FACTURACION)[number];

export const ETIQUETAS_FACTURACION: Record<EstadoFacturacion, string> = {
  no_facturado: 'No facturado',
  facturado: 'Facturado',
  no_aplica: 'No aplica',
  factura_mensual: 'Factura mensual',
  consulta_sin_costo: 'Consulta sin costo',
};

/** Type guard: ¿el valor es uno de los estados de facturación válidos? */
export function esEstadoFacturacion(v: unknown): v is EstadoFacturacion {
  return typeof v === 'string' && (ESTADOS_FACTURACION as readonly string[]).includes(v);
}

/** Valida y normaliza un estado de facturación recibido de un formulario. */
export function parseEstadoFacturacion(v: unknown): EstadoFacturacion {
  if (!esEstadoFacturacion(v)) {
    throw new ValidationError(`Estado de facturación inválido: ${String(v)}`, {
      estadoFacturacion: 'No reconocido',
    });
  }
  return v;
}

/**
 * Normaliza el estado leído de props/Firestore, con respaldo al esquema viejo
 * (`facturacion.facturado: boolean`, sin `estado`) para no romper tickets ya guardados.
 */
export function sanearEstadoFacturacion(estado: unknown, facturadoLegacy: unknown): EstadoFacturacion {
  if (esEstadoFacturacion(estado)) return estado;
  return facturadoLegacy === true ? 'facturado' : 'no_facturado';
}

/** ¿Este estado representa una factura ya emitida? (dispara el webhook `ticket.facturado`). */
export function esFacturacionCompletada(estado: EstadoFacturacion): boolean {
  return estado === 'facturado' || estado === 'factura_mensual';
}
