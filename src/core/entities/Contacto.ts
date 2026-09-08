import { ValidationError } from '../errors/DomainError.js';
import { Email } from './value-objects/Email.js';

/** Props para construir un {@link Contacto}. */
export interface ContactoProps {
  id: string;
  nombre: string;
  empresaId: string;
  puesto?: string | null;
  rfc?: string | null;
  email?: string | null;
  telefono?: string | null;
  celular?: string | null;
  /** Si el contacto tiene (o tendrá) acceso al portal de clientes. */
  esPortal?: boolean;
  /** uid de la cuenta de portal vinculada, si existe. */
  uid?: string | null;
  notas?: string | null;
  activo?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

/** Persona de contacto asociada a una empresa. */
export class Contacto {
  readonly id: string;
  nombre: string;
  empresaId: string;
  puesto: string | null;
  rfc: string | null;
  email: string | null;
  telefono: string | null;
  celular: string | null;
  esPortal: boolean;
  uid: string | null;
  notas: string | null;
  activo: boolean;
  readonly createdAt: Date;
  updatedAt: Date;

  constructor(props: ContactoProps) {
    if (props.nombre.trim().length < 2) {
      throw new ValidationError('El nombre del contacto es obligatorio', { nombre: 'Requerido' });
    }
    if (!props.empresaId) {
      throw new ValidationError('El contacto debe pertenecer a una empresa', { empresaId: 'Requerido' });
    }
    this.id = props.id;
    this.nombre = props.nombre.trim();
    this.empresaId = props.empresaId;
    this.puesto = props.puesto?.trim() || null;
    this.rfc = props.rfc?.trim().toUpperCase() || null;
    this.email = props.email ? Email.create(props.email).value : null;
    this.telefono = props.telefono?.trim() || null;
    this.celular = props.celular?.trim() || null;
    this.esPortal = props.esPortal ?? false;
    this.uid = props.uid ?? null;
    this.notas = props.notas?.trim() || null;
    this.activo = props.activo ?? true;
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? this.createdAt;
  }

  vincularPortal(uid: string, ahora: Date): void {
    this.uid = uid;
    this.esPortal = true;
    this.updatedAt = ahora;
  }
  archivar(ahora: Date): void {
    this.activo = false;
    this.updatedAt = ahora;
  }
  restaurar(ahora: Date): void {
    this.activo = true;
    this.updatedAt = ahora;
  }
}
