import type { Firestore } from 'firebase-admin/firestore';
import { Timestamp } from '../../core/entities/value-objects/Timestamp.js';
import type { IPizarraKBRepository } from '../../core/ports/repositories/IPizarraKBRepository.js';
import type { PizarraKB } from '../../core/entities/PizarraKB.js';

const COL = 'pizarras_kb';

export class FirestorePizarraKBRepository implements IPizarraKBRepository {
  constructor(private readonly db: Firestore) {}

  async obtener(uid: string): Promise<PizarraKB | null> {
    const snap = await this.db.collection(COL).doc(uid).get();
    if (!snap.exists) return null;
    const d = snap.data()!;
    return {
      uid,
      contenido: String(d.contenido ?? ''),
      actualizadoEn: d.actualizadoEn instanceof Timestamp ? d.actualizadoEn.toDate() : new Date(0),
    };
  }

  async guardar(p: PizarraKB): Promise<void> {
    await this.db.collection(COL).doc(p.uid).set({
      contenido: p.contenido,
      actualizadoEn: Timestamp.fromDate(p.actualizadoEn),
    });
  }
}
