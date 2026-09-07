import { type DocumentData, type Firestore, type Query } from 'firebase-admin/firestore';
import { Timestamp } from '../../core/entities/value-objects/Timestamp.js';
import type { IBitacoraRepository, FiltroBitacora } from '../../core/ports/repositories/IBitacoraRepository.js';
import type { EntradaBitacora } from '../../core/entities/EntradaBitacora.js';

const COL = 'bitacora';
/** Tope de documentos que se traen de Firestore cuando hay filtros que se resuelven en memoria. */
const TOPE_LECTURA = 2000;
/** Borrados concurrentes por tanda en {@link FirestoreBitacoraRepository.purgar}. */
const TANDA_BORRADO = 20;

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
    // El rango por fecha va a Firestore (mismo campo que el orderBy → no requiere índice
    // compuesto). `modulo`/`actorUid`/`entidadId` se filtran en memoria, igual que en
    // FirestoreTicketQueries: evita una matriz de índices y que documentos sin el campo
    // desaparezcan de la vista.
    let q: Query = this.db.collection(COL);
    if (filtro.desde) q = q.where('at', '>=', Timestamp.fromDate(filtro.desde));
    if (filtro.hasta) q = q.where('at', '<=', Timestamp.fromDate(filtro.hasta));
    q = q.orderBy('at', 'desc');

    const enMemoria = Boolean(filtro.modulo || filtro.actorUid || filtro.entidadId);
    q = q.limit(enMemoria ? TOPE_LECTURA : (filtro.limite ?? 200));

    const snap = await q.get();
    let filas = snap.docs.map((d) => toDomain(d.id, d.data()));
    if (filtro.modulo) filas = filas.filter((f) => f.modulo === filtro.modulo);
    if (filtro.actorUid) filas = filas.filter((f) => f.actorUid === filtro.actorUid);
    if (filtro.entidadId) filas = filas.filter((f) => f.entidadId === filtro.entidadId);
    return filtro.limite ? filas.slice(0, filtro.limite) : filas;
  }

  async purgar(fecha: Date, maxBorrar = 5000): Promise<{ borradas: number; hayMas: boolean }> {
    const snap = await this.db
      .collection(COL)
      .where('at', '<', Timestamp.fromDate(fecha))
      .orderBy('at', 'asc')
      .limit(maxBorrar + 1)
      .get();
    const docs = snap.docs.slice(0, maxBorrar);
    for (let i = 0; i < docs.length; i += TANDA_BORRADO) {
      await Promise.all(docs.slice(i, i + TANDA_BORRADO).map((d) => d.ref.delete()));
    }
    return { borradas: docs.length, hayMas: snap.docs.length > maxBorrar };
  }
}
