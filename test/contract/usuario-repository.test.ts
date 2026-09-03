import { contratoUsuarioRepository } from './usuario-repository.contract.js';
import { InMemoryUsuarioRepository } from '../fakes/InMemoryUsuarioRepository.js';

// Fake en memoria: siempre.
contratoUsuarioRepository('InMemory', async () => {
  const repo = new InMemoryUsuarioRepository();
  return { repo, limpiar: async () => void (repo as unknown as { porUid: Map<string, unknown> }).porUid.clear() };
});

// Firestore/emulador: solo si FIRESTORE_EMULATOR_HOST está definido.
const emulador = process.env.FIRESTORE_EMULATOR_HOST;
if (emulador) {
  const { getFirestore } = await import('firebase-admin/firestore');
  const { initializeApp, getApps } = await import('firebase-admin/app');
  const { FirestoreUsuarioRepository } = await import(
    '../../src/infrastructure/firestore/FirestoreUsuarioRepository.js'
  );

  const { wrapFirestoreAdmin } = await import('../../src/infrastructure/firestore/wrapFirestoreAdmin.js');
  const app = getApps()[0] ?? initializeApp({ projectId: 'ds-hd-test' });
  const db = getFirestore(app);

  contratoUsuarioRepository('Firestore (emulador)', async () => {
    const repo = new FirestoreUsuarioRepository(wrapFirestoreAdmin(db));
    const limpiar = async () => {
      const snap = await db.collection('usuarios').get();
      await Promise.all(snap.docs.map((d) => d.ref.delete()));
    };
    return { repo, limpiar };
  });
} else {
  console.warn('Contrato Firestore omitido (define FIRESTORE_EMULATOR_HOST para incluirlo).');
}
