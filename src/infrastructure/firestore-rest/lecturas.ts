/**
 * Cuántas lecturas de Firestore gasta cada petición (lo que cobra la cuota diaria: 1 por
 * documento devuelto, mínimo 1 por consulta; un conteo, 1 por cada 1000). Se anota en la línea
 * `request` del log para saber qué página se come la cuota (`wrangler tail`).
 */
import { AsyncLocalStorage } from 'node:async_hooks';

const almacen = new AsyncLocalStorage<{ n: number }>();

export function conLecturas<T>(fn: () => T): { resultado: T; lecturas: () => number } {
  const caja = { n: 0 };
  return { resultado: almacen.run(caja, fn), lecturas: () => caja.n };
}

export function sumarLecturas(n: number): void {
  const caja = almacen.getStore();
  if (caja) caja.n += n;
}
