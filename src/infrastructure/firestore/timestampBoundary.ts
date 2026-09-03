import { Timestamp as AdminTimestamp } from 'firebase-admin/firestore';
import { Timestamp as CoreTimestamp } from '../../core/entities/value-objects/Timestamp.js';

/**
 * Traduce entre `Timestamp` de `firebase-admin/firestore` (lo que el SDK Admin real
 * lee/escribe) y `core/entities/value-objects/Timestamp` (lo que usan los mappers, agnóstico
 * de SDK). Solo lo usa el adaptador Admin — el adaptador REST (Workers) nunca importa este
 * archivo, así que `firebase-admin/firestore` nunca entra a ese bundle.
 */
function walk(valor: unknown, convertir: (v: unknown) => unknown): unknown {
  const convertido = convertir(valor);
  if (convertido !== undefined) return convertido;
  if (Array.isArray(valor)) return valor.map((v) => walk(v, convertir));
  if (valor !== null && typeof valor === 'object' && valor.constructor === Object) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(valor)) out[k] = walk(v, convertir);
    return out;
  }
  return valor;
}

/** Documento leído del SDK Admin → objeto plano que esperan los mappers (`CoreTimestamp`). */
export function aDominio<T>(data: T): T {
  return walk(data, (v) =>
    v instanceof AdminTimestamp ? CoreTimestamp.fromMillis(v.toMillis()) : undefined,
  ) as T;
}

/** Documento que produce un mapper (`CoreTimestamp`) → lo que espera el SDK Admin al escribir. */
export function aFirestore<T>(data: T): T {
  return walk(data, (v) =>
    v instanceof CoreTimestamp ? AdminTimestamp.fromMillis(v.toMillis()) : undefined,
  ) as T;
}
