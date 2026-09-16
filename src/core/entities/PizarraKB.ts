/** Longitud máxima del contenido de la pizarra (caracteres). */
export const PIZARRA_KB_MAX = 20_000;

/**
 * Pizarra temporal de un usuario: bloc de notas libre con autoguardado, sin estructura de
 * artículo (`pizarras_kb/{uid}`, un documento por usuario — no es un artículo publicable).
 */
export interface PizarraKB {
  uid: string;
  contenido: string;
  actualizadoEn: Date;
}
