/** Resultado de verificar credenciales. */
export interface CredencialesVerificadas {
  uid: string;
  email: string;
}

/** Datos mínimos para crear una cuenta de identidad. */
export interface CrearCuentaInput {
  email: string;
  password: string;
  nombre: string;
}

/**
 * Puerto del proveedor de identidad (hoy: Firebase Auth). Cubre solo la gestión de la
 * identidad — verificar contraseña, crear/actualizar/inhabilitar la cuenta, custom claims,
 * enlaces de acción. La SESIÓN web se maneja aparte, en `ISessionManager`.
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

  /**
   * Fija los custom claims de rol en el token: `roles` (arreglo) y `role` (el principal, para
   * compatibilidad con lectores de un solo rol). No es frontera de seguridad —
   * `firestore.rules` es deny-all— pero lo consumen servicios que leen el token.
   */
  setRolesClaim(uid: string, roles: string[]): Promise<void>;

  /** Invalida los tokens/sesiones activas del usuario (tras cambiar rol o desactivarlo). */
  revokeSessions(uid: string): Promise<void>;

  /** Genera un enlace de restablecimiento de contraseña para enviarlo por correo. */
  generatePasswordResetLink(email: string): Promise<string>;

  /**
   * Busca el uid de la cuenta de identidad con ese correo. `null` si no existe.
   * Lo usa la migración para reasignar `usuarios/{uid}` al uid real tras `auth:import`
   * (antes de eso, el uid migrado es un placeholder = el correo).
   */
  getUidByEmail(email: string): Promise<string | null>;
}
