import { ValidationError } from '../../errors/DomainError.js';

/** Roles del sistema. El orden va de mayor a menor alcance en el back-office. */
export const ROLES = [
  'admin',
  'supervisor',
  'soporte',
  'ventas',
  'agente',
  'lectura',
  'cliente',
] as const;

export type Rol = (typeof ROLES)[number];

/** Roles que operan en el back-office (`/app`). `cliente` queda fuera (solo `/portal`). */
export const ROLES_STAFF: readonly Rol[] = [
  'admin',
  'supervisor',
  'soporte',
  'ventas',
  'agente',
  'lectura',
];

/**
 * Roles que pueden ser asignados como técnico responsable de un ticket. `agente` es el rol
 * mixto heredado; `soporte` es el rol acotado equivalente. Ventas NO entra aquí.
 */
export const ROLES_TECNICOS: readonly Rol[] = ['agente', 'soporte'];

/** ¿El rol puede tomar tickets como técnico (aparece en dropdowns de asignación)? */
export function esRolTecnico(rol: Rol): boolean {
  return ROLES_TECNICOS.includes(rol);
}

/** Type guard: ¿el valor es uno de los roles válidos? */
export function esRol(value: unknown): value is Rol {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

/** ¿El rol opera en el back-office (`/app`)? */
export function esRolStaff(rol: Rol): boolean {
  return ROLES_STAFF.includes(rol);
}

/** Valida y normaliza un rol recibido de un formulario o de la BD. */
export function parseRol(value: unknown): Rol {
  if (!esRol(value)) {
    throw new ValidationError(`Rol inválido: ${String(value)}`, { rol: 'Rol no reconocido' });
  }
  return value;
}

/** Etiqueta legible para la UI. */
export const ROL_ETIQUETA: Record<Rol, string> = {
  admin: 'Administrador',
  supervisor: 'Supervisor',
  soporte: 'Soporte técnico',
  ventas: 'Comercial / Ventas',
  agente: 'Agente técnico (mixto)',
  lectura: 'Solo lectura',
  cliente: 'Cliente',
};

/**
 * Agrupación de roles para el `<select>` de alta/edición de usuarios. El orden de los grupos
 * y de los roles dentro de cada grupo es el de aparición en la UI.
 */
export const ROL_GRUPOS: ReadonlyArray<{ etiqueta: string; roles: readonly Rol[] }> = [
  { etiqueta: 'Operación', roles: ['soporte', 'ventas', 'agente'] },
  { etiqueta: 'Gestión', roles: ['supervisor', 'admin'] },
  { etiqueta: 'Restringido', roles: ['lectura', 'cliente'] },
];
