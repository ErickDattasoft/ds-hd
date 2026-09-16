import type { Firestore } from 'firebase-admin/firestore';
import { Timestamp } from '../../core/entities/value-objects/Timestamp.js';
import type { IBusquedaKBRepository } from '../../core/ports/repositories/IBusquedaKBRepository.js';
import type { BusquedaKB } from '../../core/entities/BusquedaKB.js';

const COL = 'busquedas_kb';

interface Doc {
  uid?: string;
  texto?: string;
  creadoEn?: Timestamp;
}

const toDomain = (id: string, d: Doc): BusquedaKB => ({
  id,
  uid: String(d.uid ?? ''),
  texto: String(d.texto ?? ''),
  creadoEn: d.creadoEn instanceof Timestamp ? d.creadoEn.toDate() : new Date(0),
});

/** Sirve para ambos drivers (Admin SDK y REST): solo `where` por igualdad + orden en memoria. */
export class FirestoreBusquedaKBRepository implements IBusquedaKBRepository {
  constructor(private readonly db: Firestore) {}

  async listar(uid: string): Promise<BusquedaKB[]> {
    const snap = await this.db.collection(COL).where('uid', '==', uid).get();
    return snap.docs
      .map((d) => toDomain(d.id, d.data() as Doc))
      .sort((a, b) => b.creadoEn.getTime() - a.creadoEn.getTime());
  }

  async guardar(b: BusquedaKB): Promise<void> {
    await this.db.collection(COL).doc(b.id).set({
      uid: b.uid,
      texto: b.texto,
      creadoEn: Timestamp.fromDate(b.creadoEn),
    });
  }

  async eliminar(id: string): Promise<void> {
    await this.db.collection(COL).doc(id).delete();
  }

  async limpiar(uid: string): Promise<void> {
    const snap = await this.db.collection(COL).where('uid', '==', uid).get();
    await Promise.all(snap.docs.map((d) => d.ref.delete()));
  }
}
