/** Invitación de un solo uso para fijar contraseña (staff nuevo o cliente del portal). */
export interface Invitacion {
  /** Token opaco que viaja en la URL del correo de invitación. */
  token: string;
  uid: string;
  email: string;
  /** Quién la generó (uid del staff). */
  invitadoPor: string;
  createdAt: Date;
  expiresAt: Date;
  usadaEn: Date | null;
}

/**
 * Invitaciones de un solo uso para que un cliente (o staff nuevo) fije su contraseña.
 * Colección `invitaciones/{token}`.
 */
export interface IInvitacionRepository {
  create(data: Omit<Invitacion, 'usadaEn'>): Promise<void>;
  findByToken(token: string): Promise<Invitacion | null>;
  marcarUsada(token: string, cuando: Date): Promise<void>;
}
