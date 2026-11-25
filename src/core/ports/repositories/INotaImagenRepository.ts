import type { NotaImagen } from '../../entities/NotaPersonal.js';

/** Imágenes de las notas personales: un documento por imagen (`notas_imagenes/{id}`). */
export interface INotaImagenRepository {
  crear(imagen: NotaImagen): Promise<void>;
  /** Una imagen con su contenido, o null. */
  obtener(id: string): Promise<NotaImagen | null>;
  /** Borra varias (al quitarlas de la nota o al borrar la nota para siempre). */
  eliminarVarias(ids: readonly string[]): Promise<void>;
  /** Todas, con contenido (para el .zip de imágenes del respaldo). */
  listarTodas(): Promise<NotaImagen[]>;
}
