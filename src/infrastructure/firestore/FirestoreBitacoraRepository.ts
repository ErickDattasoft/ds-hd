import { Timestamp, type DocumentData, type Firestore, type Query } from 'firebase-admin/firestore';
import type { IBitacoraRepository, FiltroBitacora } from '../../core/ports/repositories/IBitacoraRepository.js';
import type { EntradaBitacora } from '../../core/entities/EntradaBitacora.js';

const COL = 'bitacora';

const toDomain = (id: string, d: DocumentData): EntradaBitacora => ({
  id,
  at: d.at instanceof Timestamp ? d.at.toDate() : new Date(),
  actorUid: d.actorUid ?? null,
  actorNombre: d.actorNombre ?? null,
  accion: String(d.accion ?? ''),
  modulo: String(d.modulo ?? ''),
  entidadTipo: String(d.entidadTipo ?? ''),
  entidadId: String(d.entidadId ?? ''),
  resumen: String(d.resumen ?? ''),
});

export class FirestoreBitacoraRepository implements IBitacoraRepository {
  constructor(private readonly db: Firestore) {}

  async registrar(e: EntradaBitacora): Promise<void> {
    await this.db.collection(COL).doc(e.id).set({
      at: Timestamp.fromDate(e.at),
      actorUid: e.actorUid,
      actorNombre: e.actorNombre,
      accion: e.accion,
      modulo: e.modulo,
      entidadTipo: e.entidadTipo,
      entidadId: e.entidadId,
      resumen: e.resumen,
    });
  }

  async listar(filtro: FiltroBitacora = {}): Promise<EntradaBitacora[]> {
    let q: Query = this.db.collection(COL);
    if (filtro.modulo) q = q.where('modulo', '==', filtro.modulo);
    if (filtro.actorUid) q = q.where('actorUid', '==', filtro.actorUid);
    if (filtro.entidadId) q = q.where('entidadId', '==', filtro.entidadId);
    q = q.orderBy('at', 'desc').limit(filtro.limite ?? 200);
    const snap = await q.get();
    return snap.docs.map((d) => toDomain(d.id, d.data()));
  }
}
