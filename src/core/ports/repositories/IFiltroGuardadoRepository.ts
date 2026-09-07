import type { FiltroGuardado } from '../../entities/FiltroGuardado.js';

/** Persistencia de filtros guardados por usuario (`filtros_guardados/{id}`). */
export interface IFiltroGuardadoRepository {
  findById(id: string): Promise<FiltroGuardado | null>;
  /** Filtros de un usuario, opcionalmente acotados a un módulo, más nuevos primero. */
  listar(uid: string, modulo?: string): Promise<FiltroGuardado[]>;
  guardar(filtro: FiltroGuardado): Promise<void>;
  eliminar(id: string): Promise<void>;
}
