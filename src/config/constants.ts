/** Constantes de toda la app que no dependen del entorno. */

/** Nombre de la cookie de sesión (session cookie de Firebase Admin). */
export const SESSION_COOKIE_NAME = '__session';

/** Duración máxima absoluta de la session cookie (aunque haya actividad). */
export const SESSION_COOKIE_MAX_AGE_MS = 5 * 24 * 60 * 60 * 1000; // 5 días

/** Inactividad máxima permitida: sin actividad durante este tiempo, la sesión se cierra. */
export const SESSION_IDLE_MAX_AGE_MS = 8 * 60 * 60 * 1000; // 8 h (paridad con el CRM viejo)

/** Cada cuánto se refresca `lastSeenAt` en la cookie (evita reescribirla en cada request). */
export const SESSION_TOUCH_INTERVAL_MS = 15 * 60 * 1000;

/** Login: intentos fallidos consecutivos antes de bloquear temporalmente el correo. */
export const LOGIN_MAX_INTENTOS = 5;
/** Login: ventana en la que se cuentan los intentos fallidos. */
export const LOGIN_VENTANA_MS = 15 * 60 * 1000;
/** Login: cuánto dura el bloqueo tras superar el máximo de intentos. */
export const LOGIN_BLOQUEO_MS = 15 * 60 * 1000;

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
