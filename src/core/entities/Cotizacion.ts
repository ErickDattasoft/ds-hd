import { ValidationError } from '../errors/DomainError.js';

export type EstadoCotizacion = 'borrador' | 'enviada' | 'aceptada' | 'rechazada' | 'vencida';

export interface ConceptoCotizacion {
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  /** cantidad * precioUnitario (se recalcula al guardar). */
  importe: number;
}

export interface CotizacionProps {
  id: string;
  folio: string;
  empresaId: string;
  empresaNombre?: string | null;
  contactoId?: string | null;
  fecha: Date;
  vigenciaDias?: number;
  estado?: EstadoCotizacion;
  moneda?: string;
  ivaTasa?: number;
  conceptos?: ConceptoCotizacion[];
  notas?: string | null;
  origenCalculadora?: boolean;
  parametrosCompac?: Record<string, unknown> | null;
  creadoPorUid?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

const TRANSICIONES: Record<EstadoCotizacion, EstadoCotizacion[]> = {
  borrador: ['enviada', 'rechazada'],
  enviada: ['aceptada', 'rechazada', 'vencida', 'borrador'],
  aceptada: [],
  rechazada: ['borrador'],
  vencida: ['borrador', 'enviada'],
};

/** Cotización comercial con folio consecutivo, conceptos e importes. */
export class Cotizacion {
  readonly id: string;
  readonly folio: string;
  empresaId: string;
  empresaNombre: string | null;
  contactoId: string | null;
  fecha: Date;
  vigenciaDias: number;
  estado: EstadoCotizacion;
  moneda: string;
  ivaTasa: number;
  conceptos: ConceptoCotizacion[];
  notas: string | null;
  origenCalculadora: boolean;
  parametrosCompac: Record<string, unknown> | null;
  readonly creadoPorUid: string | null;
  readonly createdAt: Date;
  updatedAt: Date;

  constructor(props: CotizacionProps) {
    this.id = props.id;
    this.folio = props.folio;
    this.empresaId = props.empresaId;
    this.empresaNombre = props.empresaNombre ?? null;
    this.contactoId = props.contactoId ?? null;
    this.fecha = props.fecha;
    this.vigenciaDias = props.vigenciaDias ?? 15;
    this.estado = props.estado ?? 'borrador';
    this.moneda = props.moneda ?? 'MXN';
    this.ivaTasa = props.ivaTasa ?? 0.16;
    this.conceptos = (props.conceptos ?? []).map((c) => ({
      descripcion: c.descripcion,
      cantidad: c.cantidad,
      precioUnitario: c.precioUnitario,
      importe: Math.round(c.cantidad * c.precioUnitario * 100) / 100,
    }));
    this.notas = props.notas ?? null;
    this.origenCalculadora = props.origenCalculadora ?? false;
    this.parametrosCompac = props.parametrosCompac ?? null;
    this.creadoPorUid = props.creadoPorUid ?? null;
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? this.createdAt;
  }

  get subtotal(): number {
    return Math.round(this.conceptos.reduce((s, c) => s + c.importe, 0) * 100) / 100;
  }
  get iva(): number {
    return Math.round(this.subtotal * this.ivaTasa * 100) / 100;
  }
  get total(): number {
    return Math.round((this.subtotal + this.iva) * 100) / 100;
  }
  get venceEl(): Date {
    return new Date(this.fecha.getTime() + this.vigenciaDias * 86_400_000);
  }

  cambiarEstado(nuevo: EstadoCotizacion, ahora: Date): void {
    if (this.estado === nuevo) throw new ValidationError(`La cotización ya está ${nuevo}`);
    if (!TRANSICIONES[this.estado].includes(nuevo)) {
      throw new ValidationError(`No se puede pasar de "${this.estado}" a "${nuevo}"`);
    }
    this.estado = nuevo;
    this.updatedAt = ahora;
  }

  reemplazarConceptos(conceptos: ConceptoCotizacion[], ahora: Date): void {
    if (this.estado === 'aceptada') throw new ValidationError('Una cotización aceptada no se edita');
    if (conceptos.length === 0) throw new ValidationError('Agrega al menos un concepto', { conceptos: 'Requerido' });
    this.conceptos = conceptos.map((c) => ({
      descripcion: c.descripcion.trim(),
      cantidad: c.cantidad,
      precioUnitario: c.precioUnitario,
      importe: Math.round(c.cantidad * c.precioUnitario * 100) / 100,
    }));
    this.updatedAt = ahora;
  }
}
