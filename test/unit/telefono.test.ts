import { describe, expect, it } from 'vitest';
import { normalizarTelefonoMx } from '../../src/core/entities/value-objects/Telefono.js';

describe('normalizarTelefonoMx', () => {
  it('agrega la lada 52 a 10 dígitos y respeta los internacionales', () => {
    expect(normalizarTelefonoMx('(999) 123-4567')).toBe('529991234567');
    expect(normalizarTelefonoMx('+52 1 999 123 4567')).toBe('5219991234567');
    expect(normalizarTelefonoMx('+1 415 523 8886')).toBe('14155238886');
    expect(normalizarTelefonoMx('123')).toBe('');
  });
});
