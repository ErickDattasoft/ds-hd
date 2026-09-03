import { describe, expect, it } from 'vitest';
import { fromRest, fromRestFields, toRest, toRestFields } from '../../src/infrastructure/firestore-rest/valueCodec.js';
import { Timestamp } from '../../src/core/entities/value-objects/Timestamp.js';

describe('valueCodec — toRest', () => {
  it('escalares', () => {
    expect(toRest(null)).toEqual({ nullValue: null });
    expect(toRest(true)).toEqual({ booleanValue: true });
    expect(toRest('hola')).toEqual({ stringValue: 'hola' });
    expect(toRest(42)).toEqual({ integerValue: '42' });
    expect(toRest(3.5)).toEqual({ doubleValue: 3.5 });
  });

  it('fechas y Timestamp → timestampValue ISO', () => {
    const d = new Date('2026-09-03T10:00:00.000Z');
    expect(toRest(d)).toEqual({ timestampValue: '2026-09-03T10:00:00.000Z' });
    expect(toRest(Timestamp.fromDate(d))).toEqual({ timestampValue: '2026-09-03T10:00:00.000Z' });
  });

  it('array y map anidados', () => {
    expect(toRest(['a', 1])).toEqual({
      arrayValue: { values: [{ stringValue: 'a' }, { integerValue: '1' }] },
    });
    expect(toRest({ x: 1, y: { z: true } })).toEqual({
      mapValue: {
        fields: { x: { integerValue: '1' }, y: { mapValue: { fields: { z: { booleanValue: true } } } } },
      },
    });
  });

  it('undefined se omite en fields', () => {
    expect(toRestFields({ a: 1, b: undefined })).toEqual({ a: { integerValue: '1' } });
  });
});

describe('valueCodec — round-trip', () => {
  it('preserva el objeto (timestamps vuelven como Timestamp)', () => {
    const original = {
      nombre: 'X',
      n: 7,
      ratio: 1.25,
      activo: false,
      creado: Timestamp.fromDate(new Date('2026-01-02T03:04:05.000Z')),
      tags: ['p', 'q'],
      meta: { anidado: true, lista: [1, 2] },
      vacio: null,
    };
    const vuelta = fromRestFields(toRestFields(original)) as typeof original;
    expect(vuelta.nombre).toBe('X');
    expect(vuelta.n).toBe(7);
    expect(vuelta.ratio).toBe(1.25);
    expect(vuelta.activo).toBe(false);
    expect(vuelta.creado).toBeInstanceOf(Timestamp);
    expect(vuelta.creado.toMillis()).toBe(original.creado.toMillis());
    expect(vuelta.tags).toEqual(['p', 'q']);
    expect(vuelta.meta).toEqual({ anidado: true, lista: [1, 2] });
    expect(vuelta.vacio).toBeNull();
  });

  it('fromRest de timestampValue → Timestamp con el instante correcto', () => {
    const v = fromRest({ timestampValue: '2026-09-03T10:00:00Z' });
    expect(v).toBeInstanceOf(Timestamp);
    expect((v as Timestamp).toDate().toISOString()).toBe('2026-09-03T10:00:00.000Z');
  });
});
