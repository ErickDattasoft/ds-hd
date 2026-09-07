import type {
  CredencialesVerificadas,
  CrearCuentaInput,
  IAuthProvider,
} from '../../src/core/ports/services/IAuthProvider.js';
import { ConflictError, UnauthorizedError } from '../../src/core/errors/DomainError.js';

interface Cuenta {
  uid: string;
  email: string;
  password: string;
  disabled: boolean;
  roles?: string[];
}

/** Fake de {@link IAuthProvider}: cuentas en memoria. */
export class FakeAuthProvider implements IAuthProvider {
  private readonly porEmail = new Map<string, Cuenta>();
  private seq = 0;
  revocados: string[] = [];

  sembrar(email: string, password: string, uid?: string): string {
    const cuenta: Cuenta = {
      uid: uid ?? `uid-${++this.seq}`,
      email: email.toLowerCase(),
      password,
      disabled: false,
    };
    this.porEmail.set(cuenta.email, cuenta);
    return cuenta.uid;
  }

  async verifyPassword(email: string, password: string): Promise<CredencialesVerificadas> {
    const c = this.porEmail.get(email.toLowerCase());
    if (!c || c.password !== password || c.disabled) {
      throw new UnauthorizedError('Correo o contraseña incorrectos');
    }
    return { uid: c.uid, email: c.email };
  }

  async createAccount(input: CrearCuentaInput): Promise<{ uid: string }> {
    if (this.porEmail.has(input.email.toLowerCase())) {
      throw new ConflictError(`El correo ${input.email} ya está registrado`);
    }
    return { uid: this.sembrar(input.email, input.password) };
  }

  async setPassword(uid: string, password: string): Promise<void> {
    for (const c of this.porEmail.values()) if (c.uid === uid) c.password = password;
  }

  async setDisabled(uid: string, disabled: boolean): Promise<void> {
    for (const c of this.porEmail.values()) if (c.uid === uid) c.disabled = disabled;
  }

  async setRolesClaim(uid: string, roles: string[]): Promise<void> {
    for (const c of this.porEmail.values()) if (c.uid === uid) c.roles = [...roles];
  }

  async revokeSessions(uid: string): Promise<void> {
    this.revocados.push(uid);
  }

  async generatePasswordResetLink(email: string): Promise<string> {
    return `https://example.test/reset?email=${encodeURIComponent(email)}`;
  }

  async getUidByEmail(email: string): Promise<string | null> {
    return this.porEmail.get(email.toLowerCase())?.uid ?? null;
  }
}
