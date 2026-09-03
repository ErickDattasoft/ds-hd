/**
 * Traducción entre valores JS planos y el formato tipado de la API REST de Firestore
 * (`{stringValue}`, `{integerValue}`, `{mapValue:{fields}}`, …).
 *
 * Timestamps: al leer se devuelven como `core/entities/value-objects/Timestamp` (lo que
 * esperan los mappers, igual que el wrapper del SDK Admin); al escribir se aceptan tanto
 * ese `Timestamp` como `Date`.
 */
import { Timestamp } from '../../core/entities/value-objects/Timestamp.js';

/** Un valor en el formato REST de Firestore (unión parcial, solo lo que usa ds-hd). */
export interface RestValue {
  nullValue?: null;
  booleanValue?: boolean;
  integerValue?: string;
  doubleValue?: number;
  stringValue?: string;
  timestampValue?: string;
  arrayValue?: { values?: RestValue[] };
  mapValue?: { fields?: Record<string, RestValue> };
}

export type RestFields = Record<string, RestValue>;

const esTimestampLike = (v: unknown): v is { toDate(): Date } =>
  typeof v === 'object' && v !== null && typeof (v as { toDate?: unknown }).toDate === 'function';

/** Valor JS → `RestValue`. Devuelve `undefined` para `undefined` (el campo se omite). */
export function toRest(v: unknown): RestValue | undefined {
  if (v === undefined) return undefined;
  if (v === null) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') {
    return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  }
  if (typeof v === 'bigint') return { integerValue: v.toString() };
  if (typeof v === 'string') return { stringValue: v };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (esTimestampLike(v)) return { timestampValue: v.toDate().toISOString() };
  if (Array.isArray(v)) {
    return { arrayValue: { values: v.map((x) => toRest(x) ?? { nullValue: null }) } };
  }
  if (typeof v === 'object') {
    return { mapValue: { fields: toRestFields(v as Record<string, unknown>) } };
  }
  throw new Error(`valueCodec: tipo no soportado ${typeof v}`);
}

/** Objeto plano → `fields` (omite las claves con valor `undefined`). */
export function toRestFields(obj: Record<string, unknown>): RestFields {
  const out: RestFields = {};
  for (const [k, v] of Object.entries(obj)) {
    const rv = toRest(v);
    if (rv !== undefined) out[k] = rv;
  }
  return out;
}

/** `RestValue` → valor JS plano. */
export function fromRest(v: RestValue | undefined): unknown {
  if (!v) return undefined;
  if ('nullValue' in v) return null;
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.integerValue !== undefined) return Number(v.integerValue);
  if (v.doubleValue !== undefined) return v.doubleValue;
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.timestampValue !== undefined) return Timestamp.fromMillis(Date.parse(v.timestampValue));
  if (v.arrayValue !== undefined) return (v.arrayValue.values ?? []).map(fromRest);
  if (v.mapValue !== undefined) return fromRestFields(v.mapValue.fields ?? {});
  return null;
}

/** `fields` → objeto plano. */
export function fromRestFields(fields: RestFields): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) out[k] = fromRest(v);
  return out;
}
