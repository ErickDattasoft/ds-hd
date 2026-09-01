import type { Rol } from '../../core/entities/value-objects/Rol.js';

/**
 * Vista del usuario autenticado que viaja en `req.user` y se pasa a los casos de uso
 * como `actor`. Incluye el conjunto EFECTIVO de permisos ya resuelto (rol + extras − revocados),
 * calculado en la capa de entrega para que `application/` no dependa del catálogo de permisos.
 */
export interface SessionUser {
  readonly uid: string;
  readonly nombre: string;
  readonly email: string;
  readonly rol: Rol;
  readonly empresaId: string | null;
  readonly activo: boolean;
  readonly esStaff: boolean;
  readonly esCliente: boolean;
  /** Permisos efectivos (`modulo:accion`). */
  readonly permisos: readonly string[];
}

/** ¿El actor tiene este permiso concreto? */
export function actorPuede(user: SessionUser, permiso: string): boolean {
  return user.permisos.includes(permiso);
}
