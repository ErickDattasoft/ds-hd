import { beforeEach, describe, expect, it } from 'vitest';
import type { IFiltroGuardadoRepository } from '../../src/core/ports/repositories/IFiltroGuardadoRepository.js';
import type { FiltroGuardado } from '../../src/core/entities/FiltroGuardado.js';
import { InMemoryFiltroGuardadoRepository } from '../fakes/InMemoryFiltroGuardadoRepository.js';

const f = (id: string, uid: string, modulo: string, minsAtras: number): FiltroGuardado => ({
  id,
  uid,
  nombre: `Filtro ${id}`,
  modulo,
  query: `q=${id}`,
  creadoEn: new Date(Date.now() - minsAtras * 60_000),
});

function contrato(
  nombre: string,
  crear: () => Promise<{ repo: IFiltroGuardadoRepository; limpiar: () => Promise<void> }>,
): void {
  describe(`IFiltroGuardadoRepository — ${nombre}`, () => {
    let repo: IFiltroGuardadoRepository;
    let limpiar: () => Promise<void>;

    beforeEach(async () => {
      ({ repo, limpiar } = await crear());
      await limpiar();
    });

    it('listar acota por usuario y módulo, más nuevos primero', async () => {
      await repo.guardar(f('a', 'u1', 'empresas', 30));
      await repo.guardar(f('b', 'u1', 'empresas', 5));
      await repo.guardar(f('c', 'u1', 'tickets', 1));
      await repo.guardar(f('d', 'u2', 'empresas', 1));

      expect((await repo.listar('u1', 'empresas')).map((x) => x.id)).toEqual(['b', 'a']);
      expect((await repo.listar('u1')).map((x) => x.id).sort()).toEqual(['a', 'b', 'c']);
      expect(await repo.listar('u3', 'empresas')).toEqual([]);
    });

    it('guardar sobrescribe por id; eliminar borra', async () => {
      await repo.guardar(f('a', 'u1', 'empresas', 10));
      await repo.guardar({ ...f('a', 'u1', 'empresas', 10), nombre: 'Renombrado' });
      expect((await repo.findById('a'))?.nombre).toBe('Renombrado');
      await repo.eliminar('a');
      expect(await repo.findById('a')).toBeNull();
    });
  });
}

contrato('InMemory', async () => {
  const repo = new InMemoryFiltroGuardadoRepository();
  return { repo, limpiar: async () => repo.items.clear() };
});

const emulador = process.env.FIRESTORE_EMULATOR_HOST;
if (emulador) {
  const { getFirestore } = await import('firebase-admin/firestore');
  const { initializeApp, getApps } = await import('firebase-admin/app');
  const { FirestoreFiltroGuardadoRepository } = await import(
    '../../src/infrastructure/firestore/FirestoreFiltroGuardadoRepository.js'
  );
  const { wrapFirestoreAdmin } = await import(
    '../../src/infrastructure/firestore/wrapFirestoreAdmin.js'
  );
  const app = getApps()[0] ?? initializeApp({ projectId: 'ds-hd-test' });
  const db = getFirestore(app);
  const limpiarCol = async () => {
    const snap = await db.collection('filtros_guardados').get();
    await Promise.all(snap.docs.map((d) => d.ref.delete()));
  };
  contrato('Firestore (emulador)', async () => ({
    repo: new FirestoreFiltroGuardadoRepository(wrapFirestoreAdmin(db)),
    limpiar: limpiarCol,
  }));

  const { FirestoreRestClient } = await import(
    '../../src/infrastructure/firestore-rest/FirestoreRestClient.js'
  );
  type FS = ConstructorParameters<typeof FirestoreFiltroGuardadoRepository>[0];
  contrato('Firestore REST (emulador)', async () => {
    const rest = new FirestoreRestClient({ projectId: 'ds-hd-test', emulatorHost: emulador });
    return {
      repo: new FirestoreFiltroGuardadoRepository(rest as unknown as FS),
      limpiar: limpiarCol,
    };
  });
}
