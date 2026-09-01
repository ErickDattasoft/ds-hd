import { ValidationError } from '../errors/DomainError.js';

export interface EmpresaProps {
  id: string;
  nombre: string;
  rfc?: string | null;
  razonSocial?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  email?: string | null;
  sistemasContratados?: string[];
  /** Vigencia de licencia por sistema, formato ISO `YYYY-MM-DD`. */
  vigencias?: Record<string, string>;
  contactoPrincipalId?: string | null;
  notas?: string | null;
  activa?: boolean;
  creadoPorUid?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/** Empresa/cliente del CRM. */
export class Empresa {
  readonly id: string;
  nombre: string;
  rfc: string | null;
  razonSocial: string | null;
  direccion: string | null;
  telefono: string | null;
  email: string | null;
  sistemasContratados: string[];
  vigencias: Record<string, string>;
  contactoPrincipalId: string | null;
  notas: string | null;
  activa: boolean;
  readonly creadoPorUid: string | null;
  readonly createdAt: Date;
  updatedAt: Date;

  constructor(props: EmpresaProps) {
    if (props.nombre.trim().length < 2) {
      throw new ValidationError('El nombre de la empresa es obligatorio', { nombre: 'Requerido' });
    }
    this.id = props.id;
    this.nombre = props.nombre.trim();
    this.rfc = props.rfc?.trim().toUpperCase() || null;
    this.razonSocial = props.razonSocial?.trim() || null;
    this.direccion = props.direccion?.trim() || null;
    this.telefono = props.telefono?.trim() || null;
    this.email = props.email?.trim().toLowerCase() || null;
    this.sistemasContratados = [...new Set(props.sistemasContratados ?? [])];
    this.vigencias = props.vigencias ?? {};
    this.contactoPrincipalId = props.contactoPrincipalId ?? null;
    this.notas = props.notas?.trim() || null;
    this.activa = props.activa ?? true;
    this.creadoPorUid = props.creadoPorUid ?? null;
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? this.createdAt;
  }

  archivar(ahora: Date): void {
    this.activa = false;
    this.updatedAt = ahora;
  }
  restaurar(ahora: Date): void {
    this.activa = true;
    this.updatedAt = ahora;
  }
}
