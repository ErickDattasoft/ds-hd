import type {
  CredencialesVerificadas,
  CrearCuentaInput,
  IAuthProvider,
} from '../../core/ports/services/IAuthProvider.js';
import { ConflictError, UnauthorizedError } from '../../core/errors/DomainError.js';
import type { ILogger } from '../../core/ports/services/ILogger.js';
import {
  makeBearerTokenGetter,
  type ServiceAccount,
} from '../firestore-rest/serviceAccountAuth.js';

export interface FirebaseAuthRestOptions {
  projectId: string;
  /** Web API key del proyecto (solo para `signInWithPassword`, que no lleva bearer). */
  apiKey: string;
  /** Credenciales admin. Omitir para el emulador (usa el token `owner`). */
  serviceAccount?: ServiceAccount;
  /** `host:puerto` del emulador de Auth. Si se da, todo va contra el emulador. */
  emulatorHost?: string;
  fetchImpl?: typeof fetch;
}

/**
 * {@link IAuthProvider} 100% sobre la API REST de Identity Toolkit (sin `firebase-admin`),
 * para el despliegue en Cloudflare Workers. Los endpoints privilegiados
 * (`/v1/projects/{id}/accounts…`) llevan un bearer token de service account — el mismo flujo
 * JWT→OAuth2 que el cliente REST de Firestore. `signInWithPassword` va con la API key, igual
 * que en {@link FirebaseAuthProvider}.
 */
export class FirebaseAuthRestProvider implements IAuthProvider {
  private readonly bearer: () => Promise<string>;
  private readonly fetchImpl: typeof fetch;
  private readonly baseAdmin: string;
  private readonly baseClient: string;

  constructor(
    private readonly opts: FirebaseAuthRestOptions,
    private readonly logger: ILogger,
  ) {
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.bearer = makeBearerTokenGetter(opts.serviceAccount, this.fetchImpl);
    const host = opts.emulatorHost
      ? `http://${opts.emulatorHost}/identitytoolkit.googleapis.com/v1`
      : 'https://identitytoolkit.googleapis.com/v1';
    this.baseAdmin = `${host}/projects/${opts.projectId}`;
    this.baseClient = host;
  }

  async verifyPassword(email: string, password: string): Promise<CredencialesVerificadas> {
    const key = this.opts.apiKey || 'fake-api-key';
    const res = await this.fetchImpl(`${this.baseClient}/accounts:signInWithPassword?key=${key}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new UnauthorizedError('Correo o contraseña incorrectos');
    const data = (await res.json()) as { localId?: string; email?: string };
    if (!data.localId) throw new UnauthorizedError('Correo o contraseña incorrectos');
    return { uid: data.localId, email: data.email ?? email };
  }

  async createAccount(input: CrearCuentaInput): Promise<{ uid: string }> {
    try {
      const data = await this.admin<{ localId: string }>('/accounts', {
        email: input.email,
        password: input.password,
        displayName: input.nombre,
      });
      return { uid: data.localId };
    } catch (err) {
      if (err instanceof AuthRestError && err.status === 'EMAIL_EXISTS') {
        throw new ConflictError(`El correo ${input.email} ya está registrado`);
      }
      throw err;
    }
  }

  async setPassword(uid: string, password: string): Promise<void> {
    await this.admin('/accounts:update', { localId: uid, password });
  }

  async setDisabled(uid: string, disabled: boolean): Promise<void> {
    await this.admin('/accounts:update', { localId: uid, disableUser: disabled });
  }

  async setRoleClaim(uid: string, rol: string): Promise<void> {
    await this.admin('/accounts:update', {
      localId: uid,
      customAttributes: JSON.stringify({ role: rol }),
    });
  }

  async revokeSessions(uid: string): Promise<void> {
    // Igual que `auth.revokeRefreshTokens`: adelanta `validSince` a "ahora".
    await this.admin('/accounts:update', {
      localId: uid,
      validSince: String(Math.floor(Date.now() / 1000)),
    });
  }

  async generatePasswordResetLink(email: string): Promise<string> {
    try {
      const data = await this.admin<{ oobLink?: string }>('/accounts:sendOobCode', {
        requestType: 'PASSWORD_RESET',
        email,
        returnOobLink: true,
      });
      return data.oobLink ?? '';
    } catch (err) {
      this.logger.warn('No se pudo generar enlace de reseteo', {
        email,
        err: err instanceof Error ? err.message : err,
      });
      return ''; // no revelar si el correo existe
    }
  }

  async getUidByEmail(email: string): Promise<string | null> {
    const data = await this.admin<{ users?: Array<{ localId: string }> }>('/accounts:lookup', {
      email: [email],
    });
    return data.users?.[0]?.localId ?? null;
  }

  private async admin<T>(path: string, body: unknown): Promise<T> {
    const res = await this.fetchImpl(`${this.baseAdmin}${path}`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${await this.bearer()}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      const texto = await res.text();
      let status: string | undefined;
      try {
        status = (JSON.parse(texto) as { error?: { message?: string } }).error?.message;
      } catch {
        /* respuesta no-JSON */
      }
      throw new AuthRestError(`AuthRest ${path}: ${res.status} ${texto}`, status);
    }
    return (await res.json()) as T;
  }
}

/** Error de un endpoint admin de Identity Toolkit; `status` es el `error.message` de Google. */
class AuthRestError extends Error {
  constructor(
    message: string,
    readonly status?: string,
  ) {
    super(message);
    this.name = 'AuthRestError';
  }
}
