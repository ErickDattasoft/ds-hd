import { describe, expect, it } from 'vitest';
import { base32, codigoTotp, desdeBase32, verificarTotp } from '../../src/application/auth/totp.js';

const SECRETO = base32(Buffer.from('12345678901234567890'));

describe('TOTP (RFC 6238)', () => {
  it('coincide con los vectores oficiales', () => {
    expect(SECRETO).toBe('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ');
    expect(codigoTotp(SECRETO, Math.floor(59 / 30))).toBe('287082');
    expect(codigoTotp(SECRETO, Math.floor(1111111109 / 30))).toBe('081804');
  });

  it('base32 ida y vuelta', () => {
    expect(desdeBase32(SECRETO).toString()).toBe('12345678901234567890');
  });

  it('acepta ±30 s y rechaza lo demás', () => {
    const ahora = new Date(1111111109 * 1000);
    expect(verificarTotp(SECRETO, '081804', ahora)).toBe(true);
    expect(verificarTotp(SECRETO, '081 804', new Date(ahora.getTime() + 30_000))).toBe(true);
    expect(verificarTotp(SECRETO, '081804', new Date(ahora.getTime() + 120_000))).toBe(false);
    expect(verificarTotp(SECRETO, 'abc', ahora)).toBe(false);
  });
});
