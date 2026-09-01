import type { Auth } from 'firebase-admin/auth';
import type {
  CredencialesVerificadas,
  CrearCuentaInput,
  IAuthProvider,
} from '../../core/ports/services/IAuthProvider.js';
import { ConflictError, UnauthorizedError } from '../../core/errors/DomainError.js';
import type { ILogger } from '../../core/ports/services/ILogger.js';

export interface FirebaseAuthProviderOpts {
  apiKey: string;
  /** host:puerto del emulador de Auth, o '' para Firebase real. */
  emulatorHost: string;
}

/** Adaptador de {@link IAuthProvider} sobre Firebase Auth (Admin SDK + REST de Identity Toolkit). */
export class FirebaseAuthProvider implements IAuthProvider {
  constructor(
    private readonly auth: Auth,
    private readonly opts: FirebaseAuthProviderOpts,
    private readonly logger: ILogger,
  ) {}

  private get signInUrl(): string {
    const key = this.opts.apiKey || 'fake-api-key';
    return this.opts.emulatorHost
      ? `http://${this.opts.emulatorHost}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${key}`
      : `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${key}`;
  }

  async verifyPassword(email: string, password: string): Promise<CredencialesVerificadas> {
    const res = await fetch(this.signInUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      throw new UnauthorizedError('Correo o contraseña incorrectos');
    }
    const data = (await res.json()) as { localId?: string; email?: string };
    if (!data.localId) throw new UnauthorizedError('Correo o contraseña incorrectos');
    return { uid: data.localId, email: data.email ?? email };
  }

  async createAccount(input: CrearCuentaInput): Promise<{ uid: string }> {
    try {
      const user = await this.auth.createUser({
        email: input.email,
        password: input.password,
        displayName: input.nombre,
      });
      return { uid: user.uid };
    } catch (err) {
      if (isFirebaseError(err) && err.code === 'auth/email-already-exists') {
        throw new ConflictError(`El correo ${input.email} ya está registrado`);
      }
      throw err;
    }
  }

  async setPassword(uid: string, password: string): Promise<void> {
    await this.auth.updateUser(uid, { password });
  }

  async setDisabled(uid: string, disabled: boolean): Promise<void> {
    await this.auth.updateUser(uid, { disabled });
  }

  async setRoleClaim(uid: string, rol: string): Promise<void> {
    await this.auth.setCustomUserClaims(uid, { role: rol });
  }

  async revokeSessions(uid: string): Promise<void> {
    await this.auth.revokeRefreshTokens(uid);
  }

  async generatePasswordResetLink(email: string): Promise<string> {
    try {
      return await this.auth.generatePasswordResetLink(email);
    } catch (err) {
      this.logger.warn('No se pudo generar enlace de reseteo', {
        email,
        err: err instanceof Error ? err.message : err,
      });
      // No revelar si el correo existe.
      return '';
    }
  }
}

function isFirebaseError(err: unknown): err is { code: string } {
  return typeof err === 'object' && err !== null && 'code' in err;
}
