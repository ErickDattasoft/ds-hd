import { ValidationError } from '../../errors/DomainError.js';

/**
 * Estados por defecto del ciclo de vida de un ticket. La lista es configurable en
 * Configuración → Tickets, pero estos son la semántica base:
 *  - `abierto` / `pendiente`  → cuentan como ESPERA (no suman tiempo trabajado, pausan SLA)
 *  - `en proceso`             → trabajo activo (suma tiempo trabajado, corre el SLA)
 *  - `resuelto` / `cerrado`   → finales (detienen el SLA)
 */
export const ESTADOS_POR_DEFECTO = [
  'Abierto',
  'En proceso',
  'Pendiente',
  'Resuelto',
  'Cerrado',
] as const;

export type EstadoTicket = string;

/** Normaliza un estado a su forma comparable (minúsculas, sin acentos). */
export function slugEstado(estado: string): string {
  return estado
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();
}

const ESPERA = new Set(['abierto', 'pendiente']);
const FINALES = new Set(['resuelto', 'cerrado']);

/** ¿Estado de espera para el cálculo de TIEMPO TRABAJADO (no cuenta como trabajo)? */
export function esEstadoEspera(estado: string): boolean {
  return ESPERA.has(slugEstado(estado));
}

/**
 * ¿Estado que PAUSA el reloj del SLA? Solo "pendiente" (esperando al cliente): que un ticket
 * siga "abierto" sin atender SÍ debe consumir SLA.
 */
export function esEstadoPausaSla(estado: string): boolean {
  return slugEstado(estado) === 'pendiente';
}

/** ¿Estado final (resuelto o cerrado)? */
export function esEstadoFinal(estado: string): boolean {
  return FINALES.has(slugEstado(estado));
}

/** ¿Estado que marca el ticket como resuelto? */
export function esEstadoResuelto(estado: string): boolean {
  return slugEstado(estado) === 'resuelto';
}

/** ¿Estado que marca el ticket como cerrado? */
export function esEstadoCerrado(estado: string): boolean {
  return slugEstado(estado) === 'cerrado';
}

/**
 * Valida una transición de estado. Regla simple y permisiva pero no absurda:
 *  - no se puede transicionar al mismo estado
 *  - desde `cerrado` solo se puede reabrir (a un no-final)
 *  - cualquier otra transición entre estados del catálogo es válida
 */
export function validarTransicion(desde: string, hacia: string, catalogo: readonly string[]): void {
  if (!catalogo.some((e) => slugEstado(e) === slugEstado(hacia))) {
    throw new ValidationError(`El estado "${hacia}" no está en el catálogo`, {
      estado: 'Estado no válido',
    });
  }
  if (slugEstado(desde) === slugEstado(hacia)) {
    throw new ValidationError(`El ticket ya está en estado "${hacia}"`);
  }
  if (slugEstado(desde) === 'cerrado' && esEstadoFinal(hacia)) {
    throw new ValidationError('Un ticket cerrado solo puede reabrirse a un estado activo');
  }
}
