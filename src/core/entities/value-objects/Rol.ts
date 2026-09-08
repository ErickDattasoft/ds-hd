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

/** Type guard: ¿el valor es uno de los roles válidos? */
export function esRol(value: unknown): value is Rol {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

/** ¿El rol opera en el back-office (`/app`)? */
export function esRolStaff(rol: Rol): boolean {
  return ROLES_STAFF.includes(rol);
}

/** Valida y normaliza un rol suelto. Uso interno de {@link parseRoles} (lecturas legacy). */
function parseRol(value: unknown): Rol {
  if (!esRol(value)) {
    throw new ValidationError(`Rol inválido: ${String(value)}`, { rol: 'Rol no reconocido' });
  }
  return value;
}

/**
 * Valida y normaliza un conjunto de roles (de un formulario o de la BD). Acepta un string
 * suelto (legacy: `usuarios/{uid}.rol`) o un arreglo. Deduplica y respeta el orden de `ROLES`.
 * Lanza si queda vacío o si algún valor no es un rol conocido.
 */
export function parseRoles(value: unknown): Rol[] {
  const crudos = Array.isArray(value) ? value : value == null ? [] : [value];
  const roles = crudos.map(parseRol);
  const unicos = [...new Set(roles)];
  if (unicos.length === 0) {
    throw new ValidationError('Asigna al menos un rol', { roles: 'Requerido' });
  }
  return ROLES.filter((r) => unicos.includes(r));
}

/** El rol de mayor alcance del conjunto (el primero según el orden de `ROLES`). */
export function rolPrincipal(roles: readonly Rol[]): Rol {
  const principal = ROLES.find((r) => roles.includes(r));
  if (!principal) throw new ValidationError('El usuario no tiene ningún rol', { roles: 'Requerido' });
  return principal;
}

/** ¿Alguno de los roles puede tomar tickets como técnico? */
export function rolesIncluyenTecnico(roles: readonly Rol[]): boolean {
  return roles.some((r) => ROLES_TECNICOS.includes(r));
}

/**
 * Regla de coherencia del conjunto de roles: `cliente` es exclusivo (nunca junto a roles de
 * staff) y el conjunto no puede quedar vacío.
 */
export function sonRolesCoherentes(roles: readonly Rol[]): { ok: boolean; error?: string } {
  if (roles.length === 0) return { ok: false, error: 'Asigna al menos un rol' };
  const tieneCliente = roles.includes('cliente');
  const tieneStaff = roles.some((r) => ROLES_STAFF.includes(r));
  if (tieneCliente && tieneStaff) {
    return { ok: false, error: 'El rol «Cliente» no se puede combinar con roles de personal' };
  }
  return { ok: true };
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
