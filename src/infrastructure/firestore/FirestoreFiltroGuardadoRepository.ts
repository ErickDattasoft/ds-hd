import type { Firestore } from 'firebase-admin/firestore';
import { Timestamp } from '../../core/entities/value-objects/Timestamp.js';
import type { IFiltroGuardadoRepository } from '../../core/ports/repositories/IFiltroGuardadoRepository.js';
import type { FiltroGuardado } from '../../core/entities/FiltroGuardado.js';

const COL = 'filtros_guardados';

interface Doc {
  uid?: string;
  nombre?: string;
  modulo?: string;
  query?: string;
  creadoEn?: Timestamp;
}

const toDomain = (id: string, d: Doc): FiltroGuardado => ({
  id,
  uid: String(d.uid ?? ''),
  nombre: String(d.nombre ?? ''),
  modulo: String(d.modulo ?? ''),
  query: String(d.query ?? ''),
  creadoEn: d.creadoEn instanceof Timestamp ? d.creadoEn.toDate() : new Date(0),
});

/** Sirve para ambos drivers (Admin SDK y REST): solo `where` por igualdad + orden en memoria. */
export class FirestoreFiltroGuardadoRepository implements IFiltroGuardadoRepository {
  constructor(private readonly db: Firestore) {}

  async findById(id: string): Promise<FiltroGuardado | null> {
    const snap = await this.db.collection(COL).doc(id).get();
    return snap.exists ? toDomain(snap.id, snap.data() as Doc) : null;
  }

  async listar(uid: string, modulo?: string): Promise<FiltroGuardado[]> {
    const snap = await this.db.collection(COL).where('uid', '==', uid).get();
    return snap.docs
      .map((d) => toDomain(d.id, d.data() as Doc))
      .filter((f) => !modulo || f.modulo === modulo)
      .sort((a, b) => b.creadoEn.getTime() - a.creadoEn.getTime());
  }

  async guardar(f: FiltroGuardado): Promise<void> {
    await this.db.collection(COL).doc(f.id).set({
      uid: f.uid,
      nombre: f.nombre,
      modulo: f.modulo,
      query: f.query,
      creadoEn: Timestamp.fromDate(f.creadoEn),
    });
  }

  async eliminar(id: string): Promise<void> {
    await this.db.collection(COL).doc(id).delete();
  }
}
