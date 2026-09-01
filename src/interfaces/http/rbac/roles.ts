import type { Rol } from '../../../core/entities/value-objects/Rol.js';
import { PERMISOS, type Permiso } from './permissions.js';

const TODOS: readonly Permiso[] = PERMISOS;

/** Permisos de solo lectura del back-office (base del rol `lectura`). */
const SOLO_LECTURA: readonly Permiso[] = [
  'dashboard:ver',
  'tickets:leer',
  'tickets:leer_todos',
  'tickets:ver_notas_internas',
  'empresas:leer',
  'contactos:leer',
  'cotizaciones:leer',
  'versiones:leer',
  'eventos:leer',
  'kb:leer',
  'bitacora:leer',
];

/**
 * Mapa rol → permisos base. Los overrides por usuario (`permisosExtra` / `permisosRevocados`)
 * se aplican encima en `policy.ts`.
 */
export const ROLE_PERMISSIONS: Record<Rol, readonly Permiso[]> = {
  admin: TODOS,

  supervisor: TODOS.filter(
    (p) => p !== 'configuracion:integraciones' && p !== 'roles:gestionar',
  ),

  agente: [
    'dashboard:ver',
    'tickets:leer',
    'tickets:crear',
    'tickets:editar',
    'tickets:asignar',
    'tickets:cambiar_estado',
    'tickets:ver_notas_internas',
    'empresas:leer',
    'contactos:leer',
    'contactos:crear',
    'contactos:editar',
    'cotizaciones:leer',
    'versiones:leer',
    'kb:leer',
    'kb:escribir',
  ],

  lectura: SOLO_LECTURA,

  cliente: ['portal:tickets', 'portal:perfil'],
};

/** Permisos base de un rol, como `Set` para consultas O(1). */
export function permisosDeRol(rol: Rol): Set<Permiso> {
  return new Set(ROLE_PERMISSIONS[rol]);
}
