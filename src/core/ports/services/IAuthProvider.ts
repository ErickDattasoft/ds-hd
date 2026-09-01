/** Resultado de verificar credenciales. */
export interface CredencialesVerificadas {
  uid: string;
  email: string;
}

export interface CrearCuentaInput {
  email: string;
  password: string;
  nombre: string;
}

/**
 * Puerto del proveedor de identidad (hoy: Firebase Auth). Cubre solo la gestión de la
 * identidad — verificar contraseña, crear/actualizar/inhabilitar la cuenta, custom claims,
 * enlaces de acción. La SESIÓN web se maneja aparte, en {@link ISessionManager}.
 *
 * La capa de aplicación depende de esta interfaz, nunca de `firebase-admin`.
 */
export interface IAuthProvider {
  /** Valida email + contraseña. Lanza `UnauthorizedError` si no coinciden. */
  verifyPassword(email: string, password: string): Promise<CredencialesVerificadas>;

  /** Crea la cuenta de identidad y devuelve su uid. Lanza `ConflictError` si el correo ya existe. */
  createAccount(input: CrearCuentaInput): Promise<{ uid: string }>;

  /** Cambia la contraseña de una cuenta existente. */
  setPassword(uid: string, password: string): Promise<void>;

  /** Habilita/inhabilita la cuenta a nivel de identidad (bloquea el login). */
  setDisabled(uid: string, disabled: boolean): Promise<void>;

  /** Fija el custom claim de rol (para reglas/servicios que lo lean del token). */
  setRoleClaim(uid: string, rol: string): Promise<void>;

  /** Invalida los tokens/sesiones activas del usuario (tras cambiar rol o desactivarlo). */
  revokeSessions(uid: string): Promise<void>;

  /** Genera un enlace de restablecimiento de contraseña para enviarlo por correo. */
  generatePasswordResetLink(email: string): Promise<string>;
}
