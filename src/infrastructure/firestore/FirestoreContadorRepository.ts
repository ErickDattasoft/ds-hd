import type { Firestore } from 'firebase-admin/firestore';
import type { IContadorRepository } from '../../core/ports/repositories/IContadorRepository.js';
import { Timestamp } from '../../core/entities/value-objects/Timestamp.js';

const COL = 'contadores';

/** Contadores atómicos con transacción Firestore (`contadores/{nombre}`). */
export class FirestoreContadorRepository implements IContadorRepository {
  constructor(private readonly db: Firestore) {}

  async siguiente(nombre: string): Promise<number> {
    const ref = this.db.collection(COL).doc(nombre);
    return this.db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const actual = snap.exists ? Number(snap.data()!.valor ?? 0) : 0;
      const nuevo = actual + 1;
      tx.set(ref, { valor: nuevo, actualizadoEn: Timestamp.now() }, { merge: true });
      return nuevo;
    });
  }

  async fijar(nombre: string, valor: number): Promise<void> {
    await this.db.collection(COL).doc(nombre).set({ valor }, { merge: true });
  }
}
