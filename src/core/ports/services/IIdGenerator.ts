/**
 * Puerto para generar identificadores opacos (ids de documento, tokens de invitación).
 * Aislado para poder inyectar una secuencia determinista en los tests.
 */
export interface IIdGenerator {
  /** Id corto para documentos (colecciones de Firestore). */
  newId(): string;
  /** Token largo, apto para URLs de un solo uso (invitaciones, reseteo de contraseña). */
  newToken(): string;
}
