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

/** Lecturas de esta instancia del Worker que el medidor de consumo aún no guarda. */
let pendientes = 0;

export function sumarLecturas(n: number): void {
  pendientes += n;
  const caja = almacen.getStore();
  if (caja) caja.n += n;
}

/** Entrega las lecturas pendientes de guardar en el medidor y las pone en cero. */
export function tomarLecturasPendientes(): number {
  const n = pendientes;
  pendientes = 0;
  return n;
}

/** Regresa lecturas que no se pudieron guardar, para intentarlo en la siguiente vuelta. */
export function devolverLecturasPendientes(n: number): void {
  pendientes += n;
}
