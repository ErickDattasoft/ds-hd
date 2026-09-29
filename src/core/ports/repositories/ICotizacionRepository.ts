import type { Cotizacion, EstadoCotizacion } from '../../entities/Cotizacion.js';

/** Filtros para listar cotizaciones. */
export interface ListarCotizacionesFiltro {
  empresaId?: string;
  /** Cotizaciones ligadas a un ticket (la hecha con «🧾 Cotizar» desde su detalle). */
  ticketId?: string;
  estado?: EstadoCotizacion;
  texto?: string;
  limite?: number;
}

/** Persistencia de cotizaciones (`cotizaciones/{id}`). */
export interface ICotizacionRepository {
  findById(id: string): Promise<Cotizacion | null>;
  list(filtro?: ListarCotizacionesFiltro): Promise<Cotizacion[]>;
  save(cotizacion: Cotizacion): Promise<void>;
  delete(id: string): Promise<void>;
  contarPorEstado(): Promise<Record<string, number>>;
  /** Cuántas hay en un estado, sin traer los documentos (conteo del servidor). */
  contarEnEstado(estado: EstadoCotizacion): Promise<number>;
}
