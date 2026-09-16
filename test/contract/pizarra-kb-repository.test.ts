import { beforeEach, describe, expect, it } from 'vitest';
import type { IPizarraKBRepository } from '../../src/core/ports/repositories/IPizarraKBRepository.js';
import { InMemoryPizarraKBRepository } from '../fakes/kb.js';

function contrato(
  nombre: string,
  crear: () => Promise<{ repo: IPizarraKBRepository; limpiar: () => Promise<void> }>,
): void {
  describe(`IPizarraKBRepository — ${nombre}`, () => {
    let repo: IPizarraKBRepository;
    let limpiar: () => Promise<void>;

    beforeEach(async () => {
      ({ repo, limpiar } = await crear());
      await limpiar();
    });

    it('sin pizarra guardada, obtener devuelve null', async () => {
      expect(await repo.obtener('u1')).toBeNull();
    });

    it('guardar y obtener por uid; un solo documento por usuario (sobrescribe)', async () => {
      await repo.guardar({ uid: 'u1', contenido: 'primero', actualizadoEn: new Date('2026-09-01T00:00:00Z') });
      await repo.guardar({ uid: 'u1', contenido: 'segundo', actualizadoEn: new Date('2026-09-02T00:00:00Z') });
      const p = await repo.obtener('u1');
      expect(p?.contenido).toBe('segundo');

      await repo.guardar({ uid: 'u2', contenido: 'de otro', actualizadoEn: new Date() });
      expect((await repo.obtener('u1'))?.contenido).toBe('segundo');
    });
  });
}

contrato('InMemory', async () => {
  const repo = new InMemoryPizarraKBRepository();
  return { repo, limpiar: async () => repo.items.clear() };
});

const emulador = process.env.FIRESTORE_EMULATOR_HOST;
if (emulador) {
  const { getFirestore } = await import('firebase-admin/firestore');
  const { initializeApp, getApps } = await import('firebase-admin/app');
  const { FirestorePizarraKBRepository } = await import(
    '../../src/infrastructure/firestore/FirestorePizarraKBRepository.js'
  );
  const { wrapFirestoreAdmin } = await import(
    '../../src/infrastructure/firestore/wrapFirestoreAdmin.js'
  );
  const app = getApps()[0] ?? initializeApp({ projectId: 'ds-hd-test' });
  const db = getFirestore(app);
  const limpiarCol = async () => {
    const snap = await db.collection('pizarras_kb').get();
    await Promise.all(snap.docs.map((d) => d.ref.delete()));
  };
  contrato('Firestore (emulador)', async () => ({
    repo: new FirestorePizarraKBRepository(wrapFirestoreAdmin(db)),
    limpiar: limpiarCol,
  }));

  const { FirestoreRestClient } = await import(
    '../../src/infrastructure/firestore-rest/FirestoreRestClient.js'
  );
  type FS = ConstructorParameters<typeof FirestorePizarraKBRepository>[0];
  contrato('Firestore REST (emulador)', async () => {
    const rest = new FirestoreRestClient({ projectId: 'ds-hd-test', emulatorHost: emulador });
    return {
      repo: new FirestorePizarraKBRepository(rest as unknown as FS),
      limpiar: limpiarCol,
    };
  });
}
