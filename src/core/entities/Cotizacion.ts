import { ValidationError } from '../errors/DomainError.js';

export type EstadoCotizacion = 'borrador' | 'enviada' | 'aceptada' | 'rechazada' | 'vencida';

/** Una línea/renglón de una cotización. */
export interface ConceptoCotizacion {
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  /** cantidad * precioUnitario (se recalcula al guardar). */
  importe: number;
}

/** Datos del emisor (quien cotiza) y del receptor (empresa/contacto) de una cotización. */
export interface DatosGeneralesCotizacion {
  /** Emisor — quien elabora la cotización. */
  emisorNombre?: string | null;
  emisorCargo?: string | null;
  emisorTelefono?: string | null;
  emisorCorreo?: string | null;
  /** Receptor — datos fiscales/de contacto de la empresa. */
  rfc?: string | null;
  contactoNombre?: string | null;
  contactoCorreo?: string | null;
  contactoTelefono?: string | null;
}

/** Props para construir una {@link Cotizacion}. */
export interface CotizacionProps extends DatosGeneralesCotizacion {
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
  /** Condiciones / términos comerciales (forma de pago, tiempos de entrega…). */
  condiciones?: string | null;
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
  condiciones: string | null;
  emisorNombre: string | null;
  emisorCargo: string | null;
  emisorTelefono: string | null;
  emisorCorreo: string | null;
  rfc: string | null;
  contactoNombre: string | null;
  contactoCorreo: string | null;
  contactoTelefono: string | null;
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
    this.condiciones = props.condiciones ?? null;
    this.emisorNombre = props.emisorNombre ?? null;
    this.emisorCargo = props.emisorCargo ?? null;
    this.emisorTelefono = props.emisorTelefono ?? null;
    this.emisorCorreo = props.emisorCorreo ?? null;
    this.rfc = props.rfc ?? null;
    this.contactoNombre = props.contactoNombre ?? null;
    this.contactoCorreo = props.contactoCorreo ?? null;
    this.contactoTelefono = props.contactoTelefono ?? null;
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

  /** Actualiza los datos generales (emisor / receptor) y las condiciones comerciales. */
  actualizarDatosGenerales(
    datos: DatosGeneralesCotizacion,
    condiciones: string | null | undefined,
    ahora: Date,
  ): void {
    const limpiar = (v: string | null | undefined): string | null => {
      const t = (v ?? '').trim();
      return t.length ? t : null;
    };
    this.emisorNombre = limpiar(datos.emisorNombre);
    this.emisorCargo = limpiar(datos.emisorCargo);
    this.emisorTelefono = limpiar(datos.emisorTelefono);
    this.emisorCorreo = limpiar(datos.emisorCorreo);
    this.rfc = limpiar(datos.rfc);
    this.contactoNombre = limpiar(datos.contactoNombre);
    this.contactoCorreo = limpiar(datos.contactoCorreo);
    this.contactoTelefono = limpiar(datos.contactoTelefono);
    if (condiciones !== undefined) this.condiciones = limpiar(condiciones);
    this.updatedAt = ahora;
  }
}
