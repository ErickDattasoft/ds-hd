/**
 * Medidor de consumo de Firestore: cada instancia del Worker va sumando sus lecturas (ver
 * `lecturas.ts`) y, como mucho una vez por minuto, las guarda en `consumo_firestore/{día}` con un
 * incremento del servidor (es una ESCRITURA: no gasta de las 50 mil lecturas). El Dashboard lo lee
 * para avisar antes de que se acabe la cuota y nadie pueda entrar.
 *
 * Es aproximado: si una instancia se apaga antes de guardar, se pierde menos de un minuto de su
 * conteo; y no cuenta lo que se lee desde la consola de Firebase.
 */
import { COLECCION_CONSUMO, diaDeCuota, horaMexicoDe } from '../../core/entities/value-objects/cuotaFirestore.js';
import { devolverLecturasPendientes, tomarLecturasPendientes } from './lecturas.js';

/** Lo único que el medidor necesita del cliente de Firestore. */
export interface ClienteIncrementos {
  incrementar(path: string, campos: Record<string, number>): Promise<void>;
}

/** Cada cuánto se guarda (como mucho) y a partir de cuántas lecturas se guarda antes. */
const CADA_MS = 60_000;
const GUARDAR_YA_DESDE = 500;

let ultimoGuardado = 0;
let guardando: Promise<void> | null = null;

/**
 * Guarda las lecturas pendientes si ya pasó un minuto (o hay muchas, o `forzar`). Nunca lanza:
 * si falla, las lecturas regresan para la siguiente vuelta.
 */
export function guardarConsumoSiToca(cliente: ClienteIncrementos, opciones: { ahora?: Date; forzar?: boolean } = {}): Promise<void> {
  if (guardando) return guardando;
  const ahora = opciones.ahora ?? new Date();
  const n = tomarLecturasPendientes();
  if (n <= 0) return Promise.resolve();
  if (!opciones.forzar && n < GUARDAR_YA_DESDE && ahora.getTime() - ultimoGuardado < CADA_MS) {
    devolverLecturasPendientes(n);
    return Promise.resolve();
  }
  ultimoGuardado = ahora.getTime();
  guardando = cliente
    .incrementar(`${COLECCION_CONSUMO}/${diaDeCuota(ahora)}`, { lecturas: n, [`horas.${horaMexicoDe(ahora)}`]: n })
    .catch((err: unknown) => {
      devolverLecturasPendientes(n);
      console.error('No se pudo guardar el consumo de Firestore', err instanceof Error ? err.message : err);
    })
    .finally(() => {
      guardando = null;
    });
  return guardando;
}

/** Solo para pruebas: vuelve a empezar el reloj del medidor. */
export function reiniciarMedidorParaPruebas(): void {
  ultimoGuardado = 0;
  guardando = null;
  tomarLecturasPendientes();
}
