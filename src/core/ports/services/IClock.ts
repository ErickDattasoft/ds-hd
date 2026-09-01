/**
 * Puerto de reloj. Los casos de uso obtienen "ahora" de aquí, nunca de `new Date()`
 * directamente, para que los tests puedan fijar el tiempo (cálculo de SLA, vencimientos).
 */
export interface IClock {
  now(): Date;
}
