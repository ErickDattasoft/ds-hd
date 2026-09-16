import type { BusquedaKB } from '../../entities/BusquedaKB.js';

/** Persistencia del historial de búsquedas de KB por usuario (`busquedas_kb/{id}`). */
export interface IBusquedaKBRepository {
  /** Búsquedas de un usuario, más recientes primero. */
  listar(uid: string): Promise<BusquedaKB[]>;
  guardar(busqueda: BusquedaKB): Promise<void>;
  eliminar(id: string): Promise<void>;
  /** Borra todo el historial de un usuario. */
  limpiar(uid: string): Promise<void>;
}
