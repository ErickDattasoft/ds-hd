import { ValidationError } from '../errors/DomainError.js';

export type EstadoEvento = 'borrador' | 'publicado' | 'finalizado' | 'cancelado';

/** Props para construir un {@link Evento}. */
export interface EventoProps {
  id: string;
  titulo: string;
  descripcion?: string | null;
  fechaHora: Date;
  cupo?: number;
  estado?: EstadoEvento;
  urlWebinar?: string | null;
  /** Horas antes del evento para enviar el recordatorio. */
  horasRecordatorio?: number;
  creadoPorUid?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/** Evento / webinar con registro público. */
export class Evento {
  readonly id: string;
  titulo: string;
  descripcion: string | null;
  fechaHora: Date;
  cupo: number;
  estado: EstadoEvento;
  urlWebinar: string | null;
  horasRecordatorio: number;
  readonly creadoPorUid: string | null;
  readonly createdAt: Date;
  updatedAt: Date;

  constructor(props: EventoProps) {
    if (props.titulo.trim().length < 3) {
      throw new ValidationError('El título del evento es obligatorio', { titulo: 'Mínimo 3 caracteres' });
    }
    this.id = props.id;
    this.titulo = props.titulo.trim();
    this.descripcion = props.descripcion?.trim() || null;
    this.fechaHora = props.fechaHora;
    this.cupo = props.cupo ?? 0;
    this.estado = props.estado ?? 'borrador';
    this.urlWebinar = props.urlWebinar?.trim() || null;
    this.horasRecordatorio = props.horasRecordatorio ?? 24;
    this.creadoPorUid = props.creadoPorUid ?? null;
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? this.createdAt;
  }

  get abiertoARegistro(): boolean {
    return this.estado === 'publicado' && this.fechaHora.getTime() > Date.now();
  }

  get sinCupo(): boolean {
    return this.cupo > 0;
  }
}
