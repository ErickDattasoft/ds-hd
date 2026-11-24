import type { NotaPersonal } from '../../entities/NotaPersonal.js';

/** Notas personales: todas las de una persona en un documento (`notas_personales/{uid}`). */
export interface INotaPersonalRepository {
  /** Las notas de la persona (1 lectura). */
  obtener(uid: string): Promise<NotaPersonal[]>;
  /** Reemplaza todas las notas de la persona (1 escritura). */
  guardar(uid: string, notas: NotaPersonal[]): Promise<void>;
  /** Las de todos, en UNA consulta (para el respaldo). */
  listarTodas(): Promise<{ uid: string; notas: NotaPersonal[] }[]>;
}
