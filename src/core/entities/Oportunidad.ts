import { ValidationError } from '../errors/DomainError.js';

/** Etapas del embudo de ventas, en orden. `ganada` y `perdida` son finales. */
export const ETAPAS_OPORTUNIDAD = ['prospecto', 'contactado', 'propuesta', 'negociacion', 'ganada', 'perdida'] as const;
export type EtapaOportunidad = (typeof ETAPAS_OPORTUNIDAD)[number];

export const ETIQUETA_ETAPA: Record<EtapaOportunidad, string> = {
  prospecto: 'Prospecto',
  contactado: 'Contactado',
  propuesta: 'Propuesta enviada',
  negociacion: 'Negociación',
  ganada: 'Ganada',
  perdida: 'Perdida',
};

/** Probabilidad de cierre por etapa, para el pronóstico ponderado. */
export const PROBABILIDAD_ETAPA: Record<EtapaOportunidad, number> = {
  prospecto: 0.1,
  contactado: 0.25,
  propuesta: 0.5,
  negociacion: 0.75,
  ganada: 1,
  perdida: 0,
};

export const esEtapa = (v: string): v is EtapaOportunidad => (ETAPAS_OPORTUNIDAD as readonly string[]).includes(v);

/** Props para construir una {@link Oportunidad}. */
export interface OportunidadProps {
  id: string;
  titulo: string;
  empresaId: string | null;
  empresaNombre: string | null;
  monto: number;
  etapa: EtapaOportunidad;
  cierreEstimado: Date | null;
  responsableUid: string | null;
  responsableNombre: string | null;
  cotizacionId: string | null;
  notas: string | null;
  motivoPerdida: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Oportunidad de venta que avanza por las etapas del embudo. */
export class Oportunidad {
  readonly id: string;
  titulo: string;
  empresaId: string | null;
  empresaNombre: string | null;
  monto: number;
  etapa: EtapaOportunidad;
  cierreEstimado: Date | null;
  responsableUid: string | null;
  responsableNombre: string | null;
  cotizacionId: string | null;
  notas: string | null;
  motivoPerdida: string | null;
  readonly createdAt: Date;
  updatedAt: Date;

  constructor(p: OportunidadProps) {
    this.id = p.id;
    this.titulo = p.titulo.trim();
    if (this.titulo.length < 2) throw new ValidationError('Escribe un título', { titulo: 'Requerido' });
    if (!Number.isFinite(p.monto) || p.monto < 0) throw new ValidationError('Monto inválido', { monto: 'Número positivo' });
    this.empresaId = p.empresaId;
    this.empresaNombre = p.empresaNombre;
    this.monto = Math.round(p.monto * 100) / 100;
    this.etapa = p.etapa;
    this.cierreEstimado = p.cierreEstimado;
    this.responsableUid = p.responsableUid;
    this.responsableNombre = p.responsableNombre;
    this.cotizacionId = p.cotizacionId;
    this.notas = p.notas?.trim() || null;
    this.motivoPerdida = p.motivoPerdida?.trim() || null;
    this.createdAt = p.createdAt;
    this.updatedAt = p.updatedAt;
  }

  get abierta(): boolean {
    return this.etapa !== 'ganada' && this.etapa !== 'perdida';
  }

  moverA(etapa: EtapaOportunidad, ahora: Date, motivoPerdida?: string): void {
    this.etapa = etapa;
    this.motivoPerdida = etapa === 'perdida' ? motivoPerdida?.trim() || this.motivoPerdida : null;
    this.updatedAt = ahora;
  }
}
