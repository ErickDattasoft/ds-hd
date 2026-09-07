import { createHmac, timingSafeEqual } from 'node:crypto';
import type { ISessionManager, SessionClaims } from '../../core/ports/services/ISessionManager.js';

/**
 * Sesión mediante un token propio: `base64url(json).firma`, firmado con HMAC-SHA256 sobre
 * `SESSION_COOKIE_SECRET`. Portátil (funciona con el emulador de Firebase) y sustituible
 * por las *session cookies* de Firebase Admin detrás del mismo puerto.
 *
 * Dos topes de vida: `maxAgeMs` (absoluto, desde la emisión) e `idleMaxAgeMs` (desde la
 * última actividad). El middleware de sesión refresca `lastSeenAt` vía {@link touch}.
 */
export class SignedCookieSessionManager implements ISessionManager {
  constructor(
    private readonly secret: string,
    private readonly maxAgeMs: number,
    private readonly idleMaxAgeMs: number,
  ) {}

  private firmar(payload: string): string {
    return createHmac('sha256', this.secret).update(payload).digest('base64url');
  }

  private codificar(full: SessionClaims): string {
    const payload = Buffer.from(JSON.stringify(full)).toString('base64url');
    return `${payload}.${this.firmar(payload)}`;
  }

  async issue(claims: Omit<SessionClaims, 'issuedAt' | 'lastSeenAt'>): Promise<string> {
    const ahora = Date.now();
    return this.codificar({ ...claims, issuedAt: ahora, lastSeenAt: ahora });
  }

  async touch(claims: SessionClaims): Promise<string> {
    return this.codificar({ ...claims, lastSeenAt: Date.now() });
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
      // Tokens emitidos antes de introducir `lastSeenAt`: se toman como recién vistos.
      if (typeof claims.lastSeenAt !== 'number') claims.lastSeenAt = claims.issuedAt;
      const ahora = Date.now();
      if (ahora - claims.issuedAt > this.maxAgeMs) return null;
      if (ahora - claims.lastSeenAt > this.idleMaxAgeMs) return null;
      return claims;
    } catch {
      return null;
    }
  }
}
