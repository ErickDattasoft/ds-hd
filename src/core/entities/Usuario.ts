import {
  esRolStaff,
  parseRoles,
  rolPrincipal,
  rolesIncluyenTecnico,
  sonRolesCoherentes,
  type Rol,
} from './value-objects/Rol.js';
import { Email } from './value-objects/Email.js';
import { ValidationError } from '../errors/DomainError.js';

/** Datos de perfil de agente técnico (solo relevantes cuando `rol === 'agente'`). */
export interface PerfilAgente {
  /** Grupo/cola al que pertenece (Soporte, Ventas…). */
  grupo: string | null;
  /** Máximo de tickets abiertos que se le pueden asignar (0 = sin límite). */
  capacidadMax: number;
  /** Si está disponible para recibir asignaciones nuevas. */
  disponibleAsignacion: boolean;
}

/** Props para construir un {@link Usuario}. */
export interface UsuarioProps {
  uid: string;
  email: string;
  nombre: string;
  /** Roles asignados; los permisos efectivos son la unión de todos. No puede quedar vacío. */
  roles?: Rol[] | Rol;
  /** @deprecated Forma legacy de un solo rol. Se acepta al leer documentos viejos. */
  rol?: Rol;
  /** Permisos concedidos por encima de los de su rol. */
  permisosExtra?: string[];
  /** Permisos retirados respecto a los de su rol. */
  permisosRevocados?: string[];
  activo?: boolean;
  /** Empresa asociada; obligatoria para `rol === 'cliente'`. */
  empresaId?: string | null;
  agente?: Partial<PerfilAgente>;
  /** Firma que se agrega a las respuestas públicas de tickets, si la tiene configurada. */
  firma?: string | null;
  /** Encabezado/plantilla que el usuario inserta al redactar un ticket (con `[fecha]`). */
  encabezado?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  lastLoginAt?: Date | null;
}

const AGENTE_POR_DEFECTO: PerfilAgente = {
  grupo: null,
  capacidadMax: 0,
  disponibleAsignacion: true,
};

/**
 * Cuenta de usuario. Aglutina staff (admin/supervisor/agente/lectura) y clientes del portal.
 * No sabe nada del catálogo de permisos: solo guarda los overrides; el cálculo del conjunto
 * efectivo vive en la capa de entrega (`interfaces/http/rbac/policy.ts`).
 */
export class Usuario {
  readonly uid: string;
  readonly email: Email;
  nombre: string;
  /** Roles asignados (fuente de verdad). Ver getters `rol`/`rolPrincipal`. */
  roles: Rol[];
  permisosExtra: string[];
  permisosRevocados: string[];
  activo: boolean;
  empresaId: string | null;
  agente: PerfilAgente;
  firma: string | null;
  encabezado: string | null;
  readonly createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;

  constructor(props: UsuarioProps) {
    this.uid = props.uid;
    this.email = Email.create(props.email);
    this.nombre = props.nombre.trim();
    this.roles = parseRoles(props.roles ?? props.rol);
    const coherencia = sonRolesCoherentes(this.roles);
    if (!coherencia.ok) {
      throw new ValidationError(coherencia.error!, { roles: coherencia.error! });
    }
    this.permisosExtra = [...new Set(props.permisosExtra ?? [])];
    this.permisosRevocados = [...new Set(props.permisosRevocados ?? [])];
    this.activo = props.activo ?? true;
    this.empresaId = props.empresaId ?? null;
    this.agente = { ...AGENTE_POR_DEFECTO, ...props.agente };
    this.firma = props.firma?.trim() || null;
    this.encabezado = props.encabezado?.trim() || null;
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? this.createdAt;
    this.lastLoginAt = props.lastLoginAt ?? null;
  }

  /** El rol de mayor alcance. Se usa donde antes se leía un solo `rol` (badges, `data-role`…). */
  get rol(): Rol {
    return rolPrincipal(this.roles);
  }

  get rolPrincipal(): Rol {
    return rolPrincipal(this.roles);
  }

  get esStaff(): boolean {
    return this.roles.some((r) => esRolStaff(r));
  }

  get esCliente(): boolean {
    return this.roles.includes('cliente');
  }

  /** ¿Puede tomar tickets como técnico (aparece en dropdowns de asignación)? */
  get esTecnico(): boolean {
    return rolesIncluyenTecnico(this.roles);
  }

  tieneRol(rol: Rol): boolean {
    return this.roles.includes(rol);
  }

  /** Reemplaza el conjunto de roles validando coherencia (`cliente` es exclusivo). */
  cambiarRoles(roles: Rol[], ahora: Date): void {
    const normalizados = parseRoles(roles);
    const coherencia = sonRolesCoherentes(normalizados);
    if (!coherencia.ok) {
      throw new ValidationError(coherencia.error!, { roles: coherencia.error! });
    }
    this.roles = normalizados;
    this.updatedAt = ahora;
  }

  registrarAcceso(ahora: Date): void {
    this.lastLoginAt = ahora;
  }

  desactivar(): void {
    this.activo = false;
    this.updatedAt = new Date();
  }

  activar(): void {
    this.activo = true;
    this.updatedAt = new Date();
  }

  fijarFirma(firma: string, ahora: Date): void {
    this.firma = firma.trim() || null;
    this.updatedAt = ahora;
  }

  fijarEncabezado(encabezado: string, ahora: Date): void {
    this.encabezado = encabezado.trim() || null;
    this.updatedAt = ahora;
  }
}
