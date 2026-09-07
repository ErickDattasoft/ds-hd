import { beforeEach, describe, expect, it } from 'vitest';
import type { IIntentosLoginRepository } from '../../src/core/ports/repositories/IIntentosLoginRepository.js';
import { InMemoryIntentosLoginRepository } from '../fakes/InMemoryIntentosLoginRepository.js';
import { LOGIN_MAX_INTENTOS } from '../../src/config/constants.js';

/** Contrato de {@link IIntentosLoginRepository}: mismas garantías para InMemory y Firestore. */
function contrato(
  nombre: string,
  crear: () => Promise<{ repo: IIntentosLoginRepository; limpiar: () => Promise<void> }>,
): void {
  describe(`IIntentosLoginRepository — ${nombre}`, () => {
    let repo: IIntentosLoginRepository;
    let limpiar: () => Promise<void>;
    const t0 = new Date('2026-09-01T12:00:00Z');

    beforeEach(async () => {
      ({ repo, limpiar } = await crear());
      await limpiar();
    });

    it('sin registro previo: no bloqueado', async () => {
      expect(await repo.consultar('nadie@x.mx', t0)).toEqual({ fallidos: 0, bloqueadoHasta: null });
    });

    it('bloquea al alcanzar el máximo de intentos', async () => {
      let estado;
      for (let i = 0; i < LOGIN_MAX_INTENTOS; i++) {
        estado = await repo.registrarFallo('ana@x.mx', t0);
      }
      expect(estado!.fallidos).toBe(LOGIN_MAX_INTENTOS);
      expect(estado!.bloqueadoHasta).toBeInstanceOf(Date);
      expect((await repo.consultar('ana@x.mx', t0)).bloqueadoHasta).toBeInstanceOf(Date);
    });

    it('el bloqueo expira al pasar la ventana', async () => {
      for (let i = 0; i < LOGIN_MAX_INTENTOS; i++) await repo.registrarFallo('ana@x.mx', t0);
      const luego = new Date(t0.getTime() + 20 * 60 * 1000);
      expect((await repo.consultar('ana@x.mx', luego)).bloqueadoHasta).toBeNull();
    });

    it('limpiar borra el registro', async () => {
      await repo.registrarFallo('ana@x.mx', t0);
      await repo.limpiar('ana@x.mx');
      expect((await repo.consultar('ana@x.mx', t0)).fallidos).toBe(0);
    });

    it('el correo se normaliza (mayúsculas / espacios)', async () => {
      await repo.registrarFallo('  ANA@x.mx ', t0);
      expect((await repo.consultar('ana@x.mx', t0)).fallidos).toBe(1);
    });
  });
}

contrato('InMemory', async () => {
  const repo = new InMemoryIntentosLoginRepository();
  return { repo, limpiar: async () => {} };
});

const emulador = process.env.FIRESTORE_EMULATOR_HOST;
if (emulador) {
  const { getFirestore } = await import('firebase-admin/firestore');
  const { initializeApp, getApps } = await import('firebase-admin/app');
  const { FirestoreIntentosLoginRepository } = await import(
    '../../src/infrastructure/firestore/FirestoreIntentosLoginRepository.js'
  );
  const { wrapFirestoreAdmin } = await import(
    '../../src/infrastructure/firestore/wrapFirestoreAdmin.js'
  );
  const app = getApps()[0] ?? initializeApp({ projectId: 'ds-hd-test' });
  const db = getFirestore(app);
  const limpiarCol = async () => {
    const snap = await db.collection('intentos_login').get();
    await Promise.all(snap.docs.map((d) => d.ref.delete()));
  };

  contrato('Firestore (emulador)', async () => ({
    repo: new FirestoreIntentosLoginRepository(wrapFirestoreAdmin(db)),
    limpiar: limpiarCol,
  }));

  const { FirestoreRestClient } = await import(
    '../../src/infrastructure/firestore-rest/FirestoreRestClient.js'
  );
  type FS = ConstructorParameters<typeof FirestoreIntentosLoginRepository>[0];
  contrato('Firestore REST (emulador)', async () => {
    const rest = new FirestoreRestClient({ projectId: 'ds-hd-test', emulatorHost: emulador });
    return {
      repo: new FirestoreIntentosLoginRepository(rest as unknown as FS),
      limpiar: limpiarCol,
    };
  });
}
