/** Contadores atómicos para folios consecutivos (`contadores/{nombre}`). */
export interface IContadorRepository {
  /** Incrementa el contador de forma transaccional y devuelve el nuevo valor. */
  siguiente(nombre: string): Promise<number>;
  /** Valor actual sin incrementarlo (0 si aún no existe). */
  actual(nombre: string): Promise<number>;
  /** Fija el valor (para inicializar tras una migración). */
  fijar(nombre: string, valor: number): Promise<void>;
  /**
   * Regresa el contador uno atrás SOLO si sigue valiendo `valor` (en transacción): libera el
   * último folio cuando se borra ese ticket. Devuelve si lo regresó.
   */
  retrocederSiEs(nombre: string, valor: number): Promise<boolean>;
}
