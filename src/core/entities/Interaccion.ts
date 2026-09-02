import { ValidationError } from '../errors/DomainError.js';

export type TipoInteraccion = 'llamada' | 'correo' | 'reunion' | 'whatsapp' | 'nota';

/** Props para construir una {@link Interaccion}. */
export interface InteraccionProps {
  id: string;
  empresaId: string;
  contactoId?: string | null;
  tipo: TipoInteraccion;
  fecha: Date;
  resumen: string;
  creadoPorUid: string | null;
  creadoPorNombre?: string | null;
  createdAt?: Date;
}

/** Registro de una interacción comercial con una empresa/contacto (seguimiento). */
export class Interaccion {
  readonly id: string;
  readonly empresaId: string;
  readonly contactoId: string | null;
  readonly tipo: TipoInteraccion;
  readonly fecha: Date;
  readonly resumen: string;
  readonly creadoPorUid: string | null;
  readonly creadoPorNombre: string | null;
  readonly createdAt: Date;

  constructor(props: InteraccionProps) {
    if (props.resumen.trim().length < 3) {
      throw new ValidationError('Escribe un resumen de la interacción', { resumen: 'Requerido' });
    }
    this.id = props.id;
    this.empresaId = props.empresaId;
    this.contactoId = props.contactoId ?? null;
    this.tipo = props.tipo;
    this.fecha = props.fecha;
    this.resumen = props.resumen.trim();
    this.creadoPorUid = props.creadoPorUid;
    this.creadoPorNombre = props.creadoPorNombre ?? null;
    this.createdAt = props.createdAt ?? new Date();
  }
}
