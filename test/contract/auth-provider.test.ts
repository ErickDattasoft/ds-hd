import { beforeEach, describe, expect, it } from 'vitest';
import type { IAuthProvider } from '../../src/core/ports/services/IAuthProvider.js';
import type { ILogger } from '../../src/core/ports/services/ILogger.js';
import { ConflictError, UnauthorizedError } from '../../src/core/errors/DomainError.js';
import { FakeAuthProvider } from '../fakes/FakeAuthProvider.js';

const nullLogger = {
  debug() {},
  info() {},
  warn() {},
  error() {},
  child() {
    return nullLogger;
  },
} as unknown as ILogger;

/** Contrato de {@link IAuthProvider}: mismas garantías para fake, SDK Admin y REST. */
function contrato(nombre: string, crear: () => Promise<{ auth: IAuthProvider; limpiar: () => Promise<void> }>): void {
  describe(`IAuthProvider — ${nombre}`, () => {
    let auth: IAuthProvider;
    let limpiar: () => Promise<void>;

    beforeEach(async () => {
      ({ auth, limpiar } = await crear());
      await limpiar();
    });

    const nueva = () => ({
      email: `u${Date.now()}${Math.random().toString(36).slice(2, 6)}@ds-hd.test`,
      password: 'contra12345',
      nombre: 'Usuario Prueba',
    });

    it('createAccount devuelve uid; correo repetido → ConflictError', async () => {
      const c = nueva();
      const { uid } = await auth.createAccount(c);
      expect(uid).toBeTruthy();
      await expect(auth.createAccount(c)).rejects.toBeInstanceOf(ConflictError);
    });

    it('verifyPassword: correcto devuelve {uid,email}; incorrecto → Unauthorized', async () => {
      const c = nueva();
      const { uid } = await auth.createAccount(c);
      const ver = await auth.verifyPassword(c.email, c.password);
      expect(ver.uid).toBe(uid);
      expect(ver.email.toLowerCase()).toBe(c.email.toLowerCase());
      await expect(auth.verifyPassword(c.email, 'mala')).rejects.toBeInstanceOf(UnauthorizedError);
    });

    it('setPassword invalida la anterior y acepta la nueva', async () => {
      const c = nueva();
      const { uid } = await auth.createAccount(c);
      await auth.setPassword(uid, 'nueva-contra-99');
      await expect(auth.verifyPassword(c.email, c.password)).rejects.toBeInstanceOf(UnauthorizedError);
      const ver = await auth.verifyPassword(c.email, 'nueva-contra-99');
      expect(ver.uid).toBe(uid);
    });

    it('setDisabled(true) bloquea el login', async () => {
      const c = nueva();
      const { uid } = await auth.createAccount(c);
      await auth.setDisabled(uid, true);
      await expect(auth.verifyPassword(c.email, c.password)).rejects.toBeInstanceOf(UnauthorizedError);
      await auth.setDisabled(uid, false);
      expect((await auth.verifyPassword(c.email, c.password)).uid).toBe(uid);
    });

    it('getUidByEmail: uid si existe, null si no', async () => {
      const c = nueva();
      const { uid } = await auth.createAccount(c);
      expect(await auth.getUidByEmail(c.email)).toBe(uid);
      expect(await auth.getUidByEmail(`nadie${Date.now()}@ds-hd.test`)).toBeNull();
    });

    it('setRolesClaim y revokeSessions no rompen la cuenta', async () => {
      const c = nueva();
      const { uid } = await auth.createAccount(c);
      await auth.setRolesClaim(uid, ['agente', 'ventas']);
      await auth.revokeSessions(uid);
      expect((await auth.verifyPassword(c.email, c.password)).uid).toBe(uid);
    });

    it('generatePasswordResetLink devuelve un string para un correo existente', async () => {
      const c = nueva();
      await auth.createAccount(c);
      const link = await auth.generatePasswordResetLink(c.email);
      expect(typeof link).toBe('string');
      expect(link.length).toBeGreaterThan(0);
    });
  });
}

contrato('Fake', async () => {
  const auth = new FakeAuthProvider();
  return { auth, limpiar: async () => void (auth as unknown as { porEmail: Map<string, unknown> }).porEmail.clear() };
});

const authEmu = process.env.FIREBASE_AUTH_EMULATOR_HOST;
if (authEmu) {
  // El emulador de Auth corre en `singleProjectMode` con `--project ds-hd-local`
  // (docker/docker-compose.yml): `signInWithPassword` solo ve cuentas de ESE proyecto,
  // así que el resto de endpoints admin también tienen que apuntar ahí.
  const PROJECT = 'ds-hd-local';
  const borrarCuentas = async () => {
    await fetch(`http://${authEmu}/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' });
  };

  const { getAuth } = await import('firebase-admin/auth');
  const { initializeApp, getApps } = await import('firebase-admin/app');
  const { FirebaseAuthProvider } = await import('../../src/infrastructure/auth/FirebaseAuthProvider.js');
  const app = getApps()[0] ?? initializeApp({ projectId: PROJECT });
  contrato('Firebase Auth SDK (emulador)', async () => ({
    auth: new FirebaseAuthProvider(getAuth(app), { apiKey: 'fake-api-key', emulatorHost: authEmu }, nullLogger),
    limpiar: borrarCuentas,
  }));

  const { FirebaseAuthRestProvider } = await import(
    '../../src/infrastructure/auth/FirebaseAuthRestProvider.js'
  );
  contrato('Firebase Auth REST (emulador)', async () => ({
    auth: new FirebaseAuthRestProvider(
      { projectId: PROJECT, apiKey: 'fake-api-key', emulatorHost: authEmu },
      nullLogger,
    ),
    limpiar: borrarCuentas,
  }));
}
