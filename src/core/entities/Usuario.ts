import { parseRol, type Rol } from './value-objects/Rol.js';
import { Email } from './value-objects/Email.js';

/** Datos de perfil de agente técnico (solo relevantes cuando `rol === 'agente'`). */
export interface PerfilAgente {
  /** Grupo/cola al que pertenece (Soporte, Ventas…). */
  grupo: string | null;
  /** Máximo de tickets abiertos que se le pueden asignar (0 = sin límite). */
  capacidadMax: number;
  /** Si está disponible para recibir asignaciones nuevas. */
  disponibleAsignacion: boolean;
}

export interface UsuarioProps {
  uid: string;
  email: string;
  nombre: string;
  rol: Rol;
  /** Permisos concedidos por encima de los de su rol. */
  permisosExtra?: string[];
  /** Permisos retirados respecto a los de su rol. */
  permisosRevocados?: string[];
  activo?: boolean;
  /** Empresa asociada; obligatoria para `rol === 'cliente'`. */
  empresaId?: string | null;
  agente?: Partial<PerfilAgente>;
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
  rol: Rol;
  permisosExtra: string[];
  permisosRevocados: string[];
  activo: boolean;
  empresaId: string | null;
  agente: PerfilAgente;
  readonly createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;

  constructor(props: UsuarioProps) {
    this.uid = props.uid;
    this.email = Email.create(props.email);
    this.nombre = props.nombre.trim();
    this.rol = parseRol(props.rol);
    this.permisosExtra = [...new Set(props.permisosExtra ?? [])];
    this.permisosRevocados = [...new Set(props.permisosRevocados ?? [])];
    this.activo = props.activo ?? true;
    this.empresaId = props.empresaId ?? null;
    this.agente = { ...AGENTE_POR_DEFECTO, ...props.agente };
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? this.createdAt;
    this.lastLoginAt = props.lastLoginAt ?? null;
  }

  get esStaff(): boolean {
    return this.rol !== 'cliente';
  }

  get esCliente(): boolean {
    return this.rol === 'cliente';
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
}
