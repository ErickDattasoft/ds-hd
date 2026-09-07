import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SignedCookieSessionManager } from '../../src/infrastructure/auth/SignedCookieSessionManager.js';

const ABS = 5 * 24 * 60 * 60 * 1000; // 5 días
const IDLE = 8 * 60 * 60 * 1000; // 8 h

describe('SignedCookieSessionManager', () => {
  let mgr: SignedCookieSessionManager;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-01T00:00:00Z'));
    mgr = new SignedCookieSessionManager('secreto-de-prueba-1234567890', ABS, IDLE);
  });

  afterEach(() => vi.useRealTimers());

  it('emite un token verificable', async () => {
    const token = await mgr.issue({ uid: 'u1' });
    expect((await mgr.verify(token))?.uid).toBe('u1');
  });

  it('cierra la sesión tras superar la inactividad máxima', async () => {
    const token = await mgr.issue({ uid: 'u1' });
    vi.setSystemTime(new Date('2026-09-01T07:59:00Z'));
    expect(await mgr.verify(token)).not.toBeNull();
    vi.setSystemTime(new Date('2026-09-01T08:01:00Z'));
    expect(await mgr.verify(token)).toBeNull();
  });

  it('touch refresca lastSeenAt conservando el tope absoluto', async () => {
    const token = await mgr.issue({ uid: 'u1' });
    vi.setSystemTime(new Date('2026-09-01T07:00:00Z'));
    const claims = await mgr.verify(token);
    const refrescado = await mgr.touch(claims!);

    // 7 h después del refresco: seguiría vivo por inactividad...
    vi.setSystemTime(new Date('2026-09-01T14:00:00Z'));
    expect(await mgr.verify(refrescado)).not.toBeNull();

    // ...pero el tope absoluto (5 días desde la emisión) no se mueve.
    vi.setSystemTime(new Date('2026-09-06T00:01:00Z'));
    expect(await mgr.verify(refrescado)).toBeNull();
  });

  it('acepta tokens antiguos sin lastSeenAt tratándolos como recién vistos', async () => {
    const legado = Buffer.from(JSON.stringify({ uid: 'u1', issuedAt: Date.now() })).toString(
      'base64url',
    );
    const firma = (mgr as unknown as { firmar(p: string): string }).firmar(legado);
    const token = `${legado}.${firma}`;
    expect((await mgr.verify(token))?.uid).toBe('u1');
  });
});
