/** Máximo de búsquedas recientes que se conservan por usuario. */
export const MAX_BUSQUEDAS_KB_POR_USUARIO = 8;

/** Una búsqueda reciente de un usuario en la base de conocimiento (`busquedas_kb/{id}`). */
export interface BusquedaKB {
  id: string;
  uid: string;
  texto: string;
  creadoEn: Date;
}
