import type { Usuario } from '../../../core/entities/Usuario.js';
import type { SessionUser } from '../../../application/shared/SessionUser.js';
import { esPermiso, type Permiso } from './permissions.js';
import { permisosDeRol } from './roles.js';

/**
 * Conjunto EFECTIVO de permisos de un usuario:
 *   (⋃ permisos de cada rol ∪ permisosExtra) − permisosRevocados
 * Solo se consideran cadenas que estén en el catálogo (`permissions.ts`).
 */
export function permisosEfectivos(usuario: Usuario): Permiso[] {
  const set = new Set<Permiso>();
  for (const rol of usuario.roles) {
    for (const p of permisosDeRol(rol)) set.add(p);
  }
  for (const p of usuario.permisosExtra) {
    if (esPermiso(p)) set.add(p);
  }
  for (const p of usuario.permisosRevocados) {
    set.delete(p as Permiso);
  }
  return [...set];
}

/** Contexto opcional para chequeos por recurso. */
export interface RecursoContexto {
  /** uid del agente asignado a un ticket, empresa dueña, etc. */
  ownerUid?: string | null;
  empresaId?: string | null;
}

/**
 * ¿`user` puede ejercer `permiso` (sobre `recurso`, si se indica)?
 *
 * Reglas por recurso:
 *  - `tickets:editar` / `tickets:cambiar_estado`: un agente sin `tickets:leer_todos` solo
 *    puede sobre tickets asignados a él.
 *  - permisos `portal:*`: además el recurso debe pertenecer a su empresa.
 */
export function can(user: SessionUser, permiso: Permiso, recurso?: RecursoContexto): boolean {
  if (!user.activo) return false;
  if (!user.permisos.includes(permiso)) return false;

  if (!recurso) return true;

  const restringidoAAsignados =
    (permiso === 'tickets:editar' || permiso === 'tickets:cambiar_estado') &&
    !user.permisos.includes('tickets:leer_todos');
  if (restringidoAAsignados && recurso.ownerUid != null && recurso.ownerUid !== user.uid) {
    return false;
  }

  if (permiso.startsWith('portal:') && recurso.empresaId != null) {
    if (user.empresaId == null || user.empresaId !== recurso.empresaId) return false;
  }

  return true;
}
