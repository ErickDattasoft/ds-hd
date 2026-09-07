/** Estado del control de intentos fallidos de un correo. */
export interface EstadoIntentosLogin {
  /** Intentos fallidos dentro de la ventana vigente. */
  fallidos: number;
  /** Si está bloqueado, hasta cuándo; `null` si puede intentar. */
  bloqueadoHasta: Date | null;
}

/**
 * Antiabuso de login: cuenta intentos fallidos por correo y bloquea temporalmente
 * (`intentos_login/{correo}`). Persistente porque en Cloudflare Workers cada request
 * puede caer en un isolate distinto — no sirve un contador en memoria.
 */
export interface IIntentosLoginRepository {
  /** Lee el estado actual sin modificarlo (para el chequeo previo al login). */
  consultar(email: string, ahora: Date): Promise<EstadoIntentosLogin>;
  /** Registra un intento fallido y devuelve el estado resultante. */
  registrarFallo(email: string, ahora: Date): Promise<EstadoIntentosLogin>;
  /** Borra el registro (tras un login correcto). */
  limpiar(email: string): Promise<void>;
}
