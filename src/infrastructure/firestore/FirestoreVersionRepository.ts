import { Timestamp, type DocumentData, type Firestore } from 'firebase-admin/firestore';
import type { IVersionRepository } from '../../core/ports/repositories/IVersionRepository.js';
import { VersionSistema } from '../../core/entities/VersionSistema.js';

const COL = 'versiones_sistemas';

const toDomain = (id: string, d: DocumentData): VersionSistema =>
  new VersionSistema({
    id,
    sistema: String(d.sistema ?? ''),
    versionActual: String(d.versionActual ?? ''),
    fechaLiberacion: d.fechaLiberacion ?? null,
    notasVersion: d.notasVersion ?? null,
    linkDescarga: d.linkDescarga ?? null,
    updatedAt: d.updatedAt instanceof Timestamp ? d.updatedAt.toDate() : new Date(),
    actualizadoPorUid: d.actualizadoPorUid ?? null,
  });

export class FirestoreVersionRepository implements IVersionRepository {
  constructor(private readonly db: Firestore) {}

  async findById(id: string): Promise<VersionSistema | null> {
    const s = await this.db.collection(COL).doc(id).get();
    return s.exists ? toDomain(s.id, s.data()!) : null;
  }

  async list(): Promise<VersionSistema[]> {
    const snap = await this.db.collection(COL).get();
    return snap.docs
      .map((d) => toDomain(d.id, d.data()))
      .sort((a, b) => a.sistema.localeCompare(b.sistema, 'es'));
  }

  async save(v: VersionSistema): Promise<void> {
    await this.db.collection(COL).doc(v.id).set(
      {
        sistema: v.sistema,
        versionActual: v.versionActual,
        fechaLiberacion: v.fechaLiberacion,
        notasVersion: v.notasVersion,
        linkDescarga: v.linkDescarga,
        updatedAt: Timestamp.fromDate(v.updatedAt),
        actualizadoPorUid: v.actualizadoPorUid,
      },
      { merge: true },
    );
  }

  async eliminar(id: string): Promise<void> {
    await this.db.collection(COL).doc(id).delete();
  }
}
