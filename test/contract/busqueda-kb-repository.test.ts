import { beforeEach, describe, expect, it } from 'vitest';
import type { IBusquedaKBRepository } from '../../src/core/ports/repositories/IBusquedaKBRepository.js';
import type { BusquedaKB } from '../../src/core/entities/BusquedaKB.js';
import { InMemoryBusquedaKBRepository } from '../fakes/kb.js';

const b = (id: string, uid: string, texto: string, minsAtras: number): BusquedaKB => ({
  id,
  uid,
  texto,
  creadoEn: new Date(Date.now() - minsAtras * 60_000),
});

function contrato(
  nombre: string,
  crear: () => Promise<{ repo: IBusquedaKBRepository; limpiar: () => Promise<void> }>,
): void {
  describe(`IBusquedaKBRepository — ${nombre}`, () => {
    let repo: IBusquedaKBRepository;
    let limpiar: () => Promise<void>;

    beforeEach(async () => {
      ({ repo, limpiar } = await crear());
      await limpiar();
    });

    it('listar acota por usuario, más nuevos primero', async () => {
      await repo.guardar(b('a', 'u1', 'vieja', 30));
      await repo.guardar(b('b', 'u1', 'nueva', 5));
      await repo.guardar(b('c', 'u2', 'de otro', 1));

      expect((await repo.listar('u1')).map((x) => x.id)).toEqual(['b', 'a']);
      expect(await repo.listar('u3')).toEqual([]);
    });

    it('eliminar borra una entrada puntual', async () => {
      await repo.guardar(b('a', 'u1', 'x', 1));
      await repo.eliminar('a');
      expect(await repo.listar('u1')).toEqual([]);
    });

    it('limpiar borra todo el historial de un usuario, sin afectar a otros', async () => {
      await repo.guardar(b('a', 'u1', 'x', 2));
      await repo.guardar(b('b', 'u1', 'y', 1));
      await repo.guardar(b('c', 'u2', 'z', 1));
      await repo.limpiar('u1');
      expect(await repo.listar('u1')).toEqual([]);
      expect(await repo.listar('u2')).toHaveLength(1);
    });
  });
}

contrato('InMemory', async () => {
  const repo = new InMemoryBusquedaKBRepository();
  return { repo, limpiar: async () => repo.items.clear() };
});

const emulador = process.env.FIRESTORE_EMULATOR_HOST;
if (emulador) {
  const { getFirestore } = await import('firebase-admin/firestore');
  const { initializeApp, getApps } = await import('firebase-admin/app');
  const { FirestoreBusquedaKBRepository } = await import(
    '../../src/infrastructure/firestore/FirestoreBusquedaKBRepository.js'
  );
  const { wrapFirestoreAdmin } = await import(
    '../../src/infrastructure/firestore/wrapFirestoreAdmin.js'
  );
  const app = getApps()[0] ?? initializeApp({ projectId: 'ds-hd-test' });
  const db = getFirestore(app);
  const limpiarCol = async () => {
    const snap = await db.collection('busquedas_kb').get();
    await Promise.all(snap.docs.map((d) => d.ref.delete()));
  };
  contrato('Firestore (emulador)', async () => ({
    repo: new FirestoreBusquedaKBRepository(wrapFirestoreAdmin(db)),
    limpiar: limpiarCol,
  }));

  const { FirestoreRestClient } = await import(
    '../../src/infrastructure/firestore-rest/FirestoreRestClient.js'
  );
  type FS = ConstructorParameters<typeof FirestoreBusquedaKBRepository>[0];
  contrato('Firestore REST (emulador)', async () => {
    const rest = new FirestoreRestClient({ projectId: 'ds-hd-test', emulatorHost: emulador });
    return {
      repo: new FirestoreBusquedaKBRepository(rest as unknown as FS),
      limpiar: limpiarCol,
    };
  });
}
