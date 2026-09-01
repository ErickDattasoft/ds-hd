/**
 * Error base del dominio. Toda la capa `core` y `application` lanza subtipos de este error;
 * la capa de entrega (interfaces/http/middlewares/errorHandler) los traduce a códigos HTTP.
 * Nunca se lanza un error de framework desde `core`/`application`.
 */
export abstract class DomainError extends Error {
  /** Código estable, legible por máquina (p. ej. `TICKET_NO_ENCONTRADO`). */
  abstract readonly code: string;
  /** Código HTTP sugerido para la capa de entrega. */
  abstract readonly httpStatus: number;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = new.target.name;
  }
}

export class NotFoundError extends DomainError {
  readonly code = 'NO_ENCONTRADO';
  readonly httpStatus = 404;

  constructor(recurso: string, id?: string) {
    super(id ? `${recurso} no encontrado: ${id}` : `${recurso} no encontrado`);
  }
}

export class ValidationError extends DomainError {
  readonly code = 'VALIDACION';
  readonly httpStatus = 422;
  /** Errores por campo, para pintarlos junto a cada input del formulario. */
  readonly campos: Readonly<Record<string, string>>;

  constructor(message: string, campos: Record<string, string> = {}) {
    super(message);
    this.campos = campos;
  }
}

export class ForbiddenError extends DomainError {
  readonly code = 'PROHIBIDO';
  readonly httpStatus = 403;

  constructor(message = 'No tienes permiso para realizar esta acción') {
    super(message);
  }
}

export class ConflictError extends DomainError {
  readonly code = 'CONFLICTO';
  readonly httpStatus = 409;
}

export class UnauthorizedError extends DomainError {
  readonly code = 'NO_AUTENTICADO';
  readonly httpStatus = 401;

  constructor(message = 'Necesitas iniciar sesión') {
    super(message);
  }
}
