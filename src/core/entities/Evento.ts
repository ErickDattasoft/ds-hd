import { ValidationError } from '../errors/DomainError.js';

export type EstadoEvento = 'borrador' | 'publicado' | 'finalizado' | 'cancelado';

/** Tope de inscripciones por IP y evento cuando el evento no fija uno propio. */
export const LIMITE_REGISTROS_POR_IP_DEFECTO = 5;

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
  /** Máximo de inscripciones desde una misma IP; `null` = usar {@link LIMITE_REGISTROS_POR_IP_DEFECTO}. */
  limiteRegistrosPorIp?: number | null;
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
  limiteRegistrosPorIp: number | null;
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
    this.limiteRegistrosPorIp =
      typeof props.limiteRegistrosPorIp === 'number' && props.limiteRegistrosPorIp > 0
        ? Math.trunc(props.limiteRegistrosPorIp)
        : null;
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

  /** El tope de inscripciones por IP que aplica de verdad (el propio o el de por defecto). */
  get limiteIpEfectivo(): number {
    return this.limiteRegistrosPorIp ?? LIMITE_REGISTROS_POR_IP_DEFECTO;
  }
}
