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
  /** Todos los roles asignados. Los permisos efectivos son la unión. */
  readonly roles: readonly Rol[];
  /** Rol de mayor alcance (para badges y `data-role`). Equivale a `roles[0]`. */
  readonly rol: Rol;
  readonly empresaId: string | null;
  readonly activo: boolean;
  readonly esStaff: boolean;
  readonly esCliente: boolean;
  /** ¿Puede tomar tickets como técnico? (tiene `agente` o `soporte` entre sus roles). */
  readonly esTecnico: boolean;
  /** Permisos efectivos (`modulo:accion`). */
  readonly permisos: readonly string[];
  /** Firma que se agrega a las respuestas públicas de tickets, si la tiene configurada. */
  readonly firma?: string | null;
  /** Encabezado/plantilla del usuario para redactar tickets (con `[fecha]`). */
  readonly encabezado?: string | null;
}

/** ¿El actor tiene este permiso concreto? */
export function actorPuede(user: SessionUser, permiso: string): boolean {
  return user.permisos.includes(permiso);
}
