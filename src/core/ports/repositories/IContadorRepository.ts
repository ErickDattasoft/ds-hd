/** Contadores atómicos para folios consecutivos (`contadores/{nombre}`). */
export interface IContadorRepository {
  /** Incrementa el contador de forma transaccional y devuelve el nuevo valor. */
  siguiente(nombre: string): Promise<number>;
  /** Fija el valor (para inicializar tras una migración). */
  fijar(nombre: string, valor: number): Promise<void>;
}
