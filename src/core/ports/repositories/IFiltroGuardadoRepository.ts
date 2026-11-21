import type { FiltroGuardado } from '../../entities/FiltroGuardado.js';

/** Persistencia de filtros guardados por usuario (`filtros_guardados/{id}`). */
export interface IFiltroGuardadoRepository {
  findById(id: string): Promise<FiltroGuardado | null>;
  /** Filtros de un usuario, opcionalmente acotados a un módulo, más nuevos primero. */
  listar(uid: string, modulo?: string): Promise<FiltroGuardado[]>;
  guardar(filtro: FiltroGuardado): Promise<void>;
  /** Los filtros de todos los usuarios en una sola consulta (para el respaldo). */
  listarTodos(): Promise<FiltroGuardado[]>;
  eliminar(id: string): Promise<void>;
}
