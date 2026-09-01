/**
 * Catálogo de permisos, en formato `modulo:accion`. Es la única lista canónica;
 * `roles.ts` la referencia y el README genera la matriz a partir de aquí (Fase 6).
 *
 * Añadir un permiso = añadirlo aquí y asignarlo en `roles.ts`. El motor (`policy.ts`)
 * no cambia (OCP).
 */
export const PERMISOS = [
  // Dashboard
  'dashboard:ver',

  // Tickets (back-office)
  'tickets:leer',
  'tickets:leer_todos',
  'tickets:crear',
  'tickets:editar',
  'tickets:asignar',
  'tickets:cambiar_estado',
  'tickets:ver_notas_internas',
  'tickets:eliminar',

  // Empresas
  'empresas:leer',
  'empresas:crear',
  'empresas:editar',
  'empresas:eliminar',

  // Contactos
  'contactos:leer',
  'contactos:crear',
  'contactos:editar',
  'contactos:eliminar',

  // Cotizaciones
  'cotizaciones:leer',
  'cotizaciones:crear',
  'cotizaciones:editar',
  'cotizaciones:aprobar',

  // Versiones de sistemas
  'versiones:leer',
  'versiones:editar',

  // Eventos / webinars
  'eventos:leer',
  'eventos:gestionar',

  // Base de conocimiento
  'kb:leer',
  'kb:escribir',
  'kb:publicar',

  // Bitácora
  'bitacora:leer',

  // Configuración
  'configuracion:catalogos',
  'configuracion:integraciones',

  // Usuarios y roles
  'usuarios:gestionar',
  'roles:gestionar',

  // Portal de cliente
  'portal:tickets',
  'portal:perfil',
] as const;

export type Permiso = (typeof PERMISOS)[number];

const SET = new Set<string>(PERMISOS);

export function esPermiso(value: unknown): value is Permiso {
  return typeof value === 'string' && SET.has(value);
}

/** Agrupa por módulo (prefijo antes de `:`) para pintar la UI de gestión de permisos. */
export function permisosPorModulo(): Record<string, Permiso[]> {
  const out: Record<string, Permiso[]> = {};
  for (const p of PERMISOS) {
    const modulo = p.split(':')[0]!;
    (out[modulo] ??= []).push(p);
  }
  return out;
}
