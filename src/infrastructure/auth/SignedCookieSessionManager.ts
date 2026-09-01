import { createHmac, timingSafeEqual } from 'node:crypto';
import type { ISessionManager, SessionClaims } from '../../core/ports/services/ISessionManager.js';

/**
 * Sesión mediante un token propio: `base64url(json).firma`, firmado con HMAC-SHA256 sobre
 * `SESSION_COOKIE_SECRET`. Portátil (funciona con el emulador de Firebase) y sustituible
 * por las *session cookies* de Firebase Admin detrás del mismo puerto.
 */
export class SignedCookieSessionManager implements ISessionManager {
  constructor(
    private readonly secret: string,
    private readonly maxAgeMs: number,
  ) {}

  private firmar(payload: string): string {
    return createHmac('sha256', this.secret).update(payload).digest('base64url');
  }

  async issue(claims: Omit<SessionClaims, 'issuedAt'>): Promise<string> {
    const full: SessionClaims = { ...claims, issuedAt: Date.now() };
    const payload = Buffer.from(JSON.stringify(full)).toString('base64url');
    return `${payload}.${this.firmar(payload)}`;
  }

  async verify(token: string): Promise<SessionClaims | null> {
    const punto = token.lastIndexOf('.');
    if (punto <= 0) return null;
    const payload = token.slice(0, punto);
    const firma = token.slice(punto + 1);

    const esperada = this.firmar(payload);
    const a = Buffer.from(firma);
    const b = Buffer.from(esperada);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

    try {
      const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as SessionClaims;
      if (typeof claims.uid !== 'string' || typeof claims.issuedAt !== 'number') return null;
      if (Date.now() - claims.issuedAt > this.maxAgeMs) return null;
      return claims;
    } catch {
      return null;
    }
  }
}
