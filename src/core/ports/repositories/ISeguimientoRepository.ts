import type { Interaccion } from '../../entities/Interaccion.js';
import type { Tarea } from '../../entities/Tarea.js';

/** Persistencia del seguimiento comercial: interacciones (`interacciones/{id}`) y tareas (`tareas/{id}`). */
export interface IInteraccionRepository {
  create(interaccion: Interaccion): Promise<void>;
  listPorEmpresa(empresaId: string): Promise<Interaccion[]>;
  listRecientes(limite: number): Promise<Interaccion[]>;
}

/** Filtros para listar tareas. */
export interface ListarTareasFiltro {
  asignadoAUid?: string;
  completada?: boolean;
  empresaId?: string;
}

/** Persistencia de tareas de seguimiento (`tareas/{id}`). */
export interface ITareaRepository {
  findById(id: string): Promise<Tarea | null>;
  list(filtro?: ListarTareasFiltro): Promise<Tarea[]>;
  save(tarea: Tarea): Promise<void>;
}
