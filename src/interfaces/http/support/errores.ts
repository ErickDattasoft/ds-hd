import { DomainError, ValidationError } from '../../../core/errors/DomainError.js';

/**
 * Normaliza un error a un mapa `{ campo: mensaje }` para repintar formularios.
 * Un {@link ValidationError} con campos los devuelve tal cual; cualquier otro error
 * de dominio va como `{ general: mensaje }`; lo demás, mensaje genérico.
 */
export function camposDeError(err: unknown): Record<string, string> {
  if (err instanceof ValidationError && Object.keys(err.campos).length > 0) {
    return { ...err.campos };
  }
  if (err instanceof DomainError) {
    return { general: err.message };
  }
  return { general: 'No se pudo completar la acción. Intenta de nuevo.' };
}
