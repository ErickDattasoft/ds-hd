import { ValidationError } from '../../errors/DomainError.js';

/** Roles del sistema. El orden va de mayor a menor alcance en el back-office. */
export const ROLES = ['admin', 'supervisor', 'agente', 'lectura', 'cliente'] as const;

export type Rol = (typeof ROLES)[number];

/** Roles que operan en el back-office (`/app`). `cliente` queda fuera (solo `/portal`). */
export const ROLES_STAFF: readonly Rol[] = ['admin', 'supervisor', 'agente', 'lectura'];

export function esRol(value: unknown): value is Rol {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

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
  agente: 'Agente técnico',
  lectura: 'Solo lectura',
  cliente: 'Cliente',
};
