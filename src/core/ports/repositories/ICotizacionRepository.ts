import type { Cotizacion, EstadoCotizacion } from '../../entities/Cotizacion.js';

export interface ListarCotizacionesFiltro {
  empresaId?: string;
  estado?: EstadoCotizacion;
  texto?: string;
  limite?: number;
}

/** Persistencia de cotizaciones (`cotizaciones/{id}`). */
export interface ICotizacionRepository {
  findById(id: string): Promise<Cotizacion | null>;
  list(filtro?: ListarCotizacionesFiltro): Promise<Cotizacion[]>;
  save(cotizacion: Cotizacion): Promise<void>;
  contarPorEstado(): Promise<Record<string, number>>;
}
