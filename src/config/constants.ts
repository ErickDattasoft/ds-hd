/** Constantes de toda la app que no dependen del entorno. */

/** Nombre de la cookie de sesión (session cookie de Firebase Admin). */
export const SESSION_COOKIE_NAME = '__session';

/** Duración de la session cookie. */
export const SESSION_COOKIE_MAX_AGE_MS = 5 * 24 * 60 * 60 * 1000; // 5 días

/** Nombre de la cookie del token CSRF (double-submit). */
export const CSRF_COOKIE_NAME = 'x-csrf-token';

/** Cache TTL del documento `usuarios/{uid}` cargado en cada request. */
export const USER_CACHE_TTL_MS = 60 * 1000;

/** Prefijos de ruta de cada área de la app. */
export const ROUTE_PREFIX = {
  public: '/',
  backoffice: '/app',
  portal: '/portal',
  webhooks: '/webhooks',
  jobs: '/jobs',
} as const;
