import type { NotaPersonal } from '../../entities/NotaPersonal.js';

/** Notas personales: todas las de una persona en un documento (`notas_personales/{uid}`). */
export interface INotaPersonalRepository {
  /** Las notas de la persona (1 lectura). */
  obtener(uid: string): Promise<NotaPersonal[]>;
  /**
   * Lee, cambia y guarda las notas de la persona en UNA transacción: dos guardados al mismo
   * tiempo (texto y color, dos pestañas) ya no se pisan. `cambiar` puede lanzar para no guardar.
   */
  modificar<T>(uid: string, cambiar: (notas: NotaPersonal[]) => { notas: NotaPersonal[]; resultado: T }): Promise<T>;
  /** Reemplaza todas las notas de la persona (1 escritura; lo usa restaurar el respaldo). */
  guardar(uid: string, notas: NotaPersonal[]): Promise<void>;
  /** Las de todos, en UNA consulta (para el respaldo). */
  listarTodas(): Promise<{ uid: string; notas: NotaPersonal[] }[]>;
}
