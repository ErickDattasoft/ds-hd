import { ValidationError } from '../errors/DomainError.js';

/** Props para construir una {@link Tarea}. */
export interface TareaProps {
  id: string;
  titulo: string;
  descripcion?: string | null;
  empresaId?: string | null;
  contactoId?: string | null;
  ticketId?: string | null;
  asignadoAUid: string;
  asignadoANombre?: string | null;
  vence?: string | null;
  completada?: boolean;
  completadaEn?: Date | null;
  creadoPorUid?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/** Tarea de seguimiento comercial / interna, asignada a un usuario. */
export class Tarea {
  readonly id: string;
  titulo: string;
  descripcion: string | null;
  empresaId: string | null;
  contactoId: string | null;
  ticketId: string | null;
  asignadoAUid: string;
  asignadoANombre: string | null;
  vence: string | null;
  completada: boolean;
  completadaEn: Date | null;
  readonly creadoPorUid: string | null;
  readonly createdAt: Date;
  updatedAt: Date;

  constructor(props: TareaProps) {
    if (props.titulo.trim().length < 3) {
      throw new ValidationError('El título de la tarea es obligatorio', { titulo: 'Mínimo 3 caracteres' });
    }
    if (!props.asignadoAUid) {
      throw new ValidationError('Asigna la tarea a alguien', { asignadoAUid: 'Requerido' });
    }
    this.id = props.id;
    this.titulo = props.titulo.trim();
    this.descripcion = props.descripcion?.trim() || null;
    this.empresaId = props.empresaId ?? null;
    this.contactoId = props.contactoId ?? null;
    this.ticketId = props.ticketId ?? null;
    this.asignadoAUid = props.asignadoAUid;
    this.asignadoANombre = props.asignadoANombre ?? null;
    this.vence = props.vence?.trim() || null;
    this.completada = props.completada ?? false;
    this.completadaEn = props.completadaEn ?? null;
    this.creadoPorUid = props.creadoPorUid ?? null;
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? this.createdAt;
  }

  marcar(completada: boolean, ahora: Date): void {
    this.completada = completada;
    this.completadaEn = completada ? ahora : null;
    this.updatedAt = ahora;
  }

  get vencida(): boolean {
    return !this.completada && this.vence != null && new Date(this.vence + 'T23:59:59') < new Date();
  }
}
