import { beforeEach, describe, expect, it } from 'vitest';
import type { IBitacoraRepository } from '../../src/core/ports/repositories/IBitacoraRepository.js';
import type { EntradaBitacora } from '../../src/core/entities/EntradaBitacora.js';
import { InMemoryBitacoraRepository } from '../fakes/crm.js';

const HOY = new Date('2026-09-07T12:00:00Z');
const entrada = (id: string, diasAtras: number, modulo: string): EntradaBitacora => ({
  id,
  at: new Date(HOY.getTime() - diasAtras * 86_400_000),
  actorUid: 'u1',
  actorNombre: 'U Uno',
  accion: 'editar',
  modulo,
  entidadTipo: modulo,
  entidadId: 'x',
  resumen: `cambio ${id}`,
});

function contrato(
  nombre: string,
  crear: () => Promise<{ repo: IBitacoraRepository; limpiar: () => Promise<void> }>,
): void {
  describe(`IBitacoraRepository — ${nombre}`, () => {
    let repo: IBitacoraRepository;
    let limpiar: () => Promise<void>;

    beforeEach(async () => {
      ({ repo, limpiar } = await crear());
      await limpiar();
      await repo.registrar(entrada('a', 90, 'tickets'));
      await repo.registrar(entrada('b', 40, 'empresas'));
      await repo.registrar(entrada('c', 1, 'tickets'));
    });

    it('lista ordenado por fecha desc', async () => {
      expect((await repo.listar()).map((e) => e.id)).toEqual(['c', 'b', 'a']);
    });

    it('filtra por rango de fechas (desde/hasta)', async () => {
      const desde = new Date(HOY.getTime() - 50 * 86_400_000);
      expect((await repo.listar({ desde })).map((e) => e.id).sort()).toEqual(['b', 'c']);
      const hasta = new Date(HOY.getTime() - 20 * 86_400_000);
      expect((await repo.listar({ hasta })).map((e) => e.id).sort()).toEqual(['a', 'b']);
    });

    it('filtra por módulo', async () => {
      expect((await repo.listar({ modulo: 'tickets' })).map((e) => e.id).sort()).toEqual(['a', 'c']);
    });

    it('purgar borra lo anterior a la fecha de corte', async () => {
      const corte = new Date(HOY.getTime() - 20 * 86_400_000);
      const r = await repo.purgar(corte);
      expect(r.borradas).toBe(2);
      expect(r.hayMas).toBe(false);
      expect((await repo.listar()).map((e) => e.id)).toEqual(['c']);
    });
  });
}

contrato('InMemory', async () => {
  const repo = new InMemoryBitacoraRepository();
  return {
    repo,
    limpiar: async () => {
      repo.entradas.splice(0);
    },
  };
});

const emulador = process.env.FIRESTORE_EMULATOR_HOST;
if (emulador) {
  const { getFirestore } = await import('firebase-admin/firestore');
  const { initializeApp, getApps } = await import('firebase-admin/app');
  const { FirestoreBitacoraRepository } = await import(
    '../../src/infrastructure/firestore/FirestoreBitacoraRepository.js'
  );
  const { wrapFirestoreAdmin } = await import(
    '../../src/infrastructure/firestore/wrapFirestoreAdmin.js'
  );
  const app = getApps()[0] ?? initializeApp({ projectId: 'ds-hd-test' });
  const db = getFirestore(app);
  const limpiarCol = async () => {
    const snap = await db.collection('bitacora').get();
    await Promise.all(snap.docs.map((d) => d.ref.delete()));
  };

  contrato('Firestore (emulador)', async () => ({
    repo: new FirestoreBitacoraRepository(wrapFirestoreAdmin(db)),
    limpiar: limpiarCol,
  }));

  const { FirestoreRestClient } = await import(
    '../../src/infrastructure/firestore-rest/FirestoreRestClient.js'
  );
  type FS = ConstructorParameters<typeof FirestoreBitacoraRepository>[0];
  contrato('Firestore REST (emulador)', async () => {
    const rest = new FirestoreRestClient({ projectId: 'ds-hd-test', emulatorHost: emulador });
    return {
      repo: new FirestoreBitacoraRepository(rest as unknown as FS),
      limpiar: limpiarCol,
    };
  });
}
