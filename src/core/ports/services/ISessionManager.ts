/** Datos mínimos que viajan dentro de la cookie de sesión. */
export interface SessionClaims {
  uid: string;
  /** Marca de tiempo (ms) en que se emitió; permite invalidar sesiones anteriores a X. */
  issuedAt: number;
}

/**
 * Emite y verifica la credencial de sesión que va en la cookie `__session`.
 *
 * Implementación de Fase 1: token propio firmado con `SESSION_COOKIE_SECRET`
 * (portátil, funciona con el emulador). El puerto permite cambiar luego a las
 * *session cookies* de Firebase Admin sin tocar la capa de aplicación ni los middlewares.
 */
export interface ISessionManager {
  issue(claims: Omit<SessionClaims, 'issuedAt'>): Promise<string>;
  verify(token: string): Promise<SessionClaims | null>;
}
