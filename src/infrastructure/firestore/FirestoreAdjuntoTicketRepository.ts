import type { Firestore } from 'firebase-admin/firestore';
import { Timestamp } from '../../core/entities/value-objects/Timestamp.js';
import type { IAdjuntoTicketRepository } from '../../core/ports/repositories/IAdjuntoTicketRepository.js';
import type { AdjuntoTicket, AdjuntoTicketMeta } from '../../core/entities/AdjuntoTicket.js';

const COL = 'tickets_adjuntos';

interface Doc {
  ticketId?: string;
  nombre?: string;
  contentType?: string;
  tamano?: number;
  data?: string;
  subidoPorUid?: string | null;
  subidoPorNombre?: string | null;
  createdAt?: Timestamp;
  permanente?: boolean;
}

/** Todos los campos menos `data` — para listar sin bajar el contenido. */
const CAMPOS_META = ['ticketId', 'nombre', 'contentType', 'tamano', 'subidoPorUid', 'subidoPorNombre', 'createdAt', 'permanente'];

const meta = (id: string, d: Doc): AdjuntoTicketMeta => ({
  id,
  ticketId: String(d.ticketId ?? ''),
  nombre: String(d.nombre ?? 'adjunto'),
  contentType: String(d.contentType ?? 'application/octet-stream'),
  tamano: Number(d.tamano ?? 0),
  subidoPorUid: d.subidoPorUid ?? null,
  subidoPorNombre: d.subidoPorNombre ?? null,
  createdAt: d.createdAt instanceof Timestamp ? d.createdAt.toDate() : new Date(0),
  ...(d.permanente ? { permanente: true } : {}),
});

/** Firestore (Admin y REST): solo `where` por igualdad + orden en memoria, sin índice compuesto. */
export class FirestoreAdjuntoTicketRepository implements IAdjuntoTicketRepository {
  constructor(private readonly db: Firestore) {}

  async crear(a: AdjuntoTicket): Promise<void> {
    await this.db
      .collection(COL)
      .doc(a.id)
      .set({
        ticketId: a.ticketId,
        nombre: a.nombre,
        contentType: a.contentType,
        tamano: a.tamano,
        data: a.data,
        subidoPorUid: a.subidoPorUid,
        subidoPorNombre: a.subidoPorNombre,
        createdAt: Timestamp.fromDate(a.createdAt),
        ...(a.permanente ? { permanente: true } : {}),
      });
  }

  async listarPorTicket(ticketId: string): Promise<AdjuntoTicketMeta[]> {
    const snap = await this.db.collection(COL).where('ticketId', '==', ticketId).get();
    return snap.docs
      .map((d) => meta(d.id, d.data() as Doc))
      .sort((x, y) => x.createdAt.getTime() - y.createdAt.getTime());
  }

  async obtener(id: string): Promise<AdjuntoTicket | null> {
    const snap = await this.db.collection(COL).doc(id).get();
    if (!snap.exists) return null;
    const d = snap.data() as Doc;
    return { ...meta(id, d), data: String(d.data ?? '') };
  }

  async eliminar(id: string): Promise<void> {
    await this.db.collection(COL).doc(id).delete();
  }

  async eliminarPorTicket(ticketId: string): Promise<void> {
    const snap = await this.db.collection(COL).where('ticketId', '==', ticketId).get();
    await Promise.all(snap.docs.map((d) => this.db.collection(COL).doc(d.id).delete()));
  }

  async sumarBytesTotal(): Promise<number> {
    const snap = await this.db.collection(COL).select('tamano').get();
    return snap.docs.reduce((total, d) => total + Number((d.data() as Doc).tamano ?? 0), 0);
  }

  async listarImagenes(): Promise<AdjuntoTicket[]> {
    const snap = await this.db.collection(COL).get();
    return snap.docs
      .map((d) => ({ ...meta(d.id, d.data() as Doc), data: String((d.data() as Doc).data ?? '') }))
      .filter((a) => a.contentType.startsWith('image/') && a.data.startsWith('data:'));
  }

  async listarTodosMeta(): Promise<AdjuntoTicketMeta[]> {
    const snap = await this.db.collection(COL).select(...CAMPOS_META).get();
    return snap.docs.map((d) => meta(d.id, d.data() as Doc));
  }

  async marcarPermanente(id: string, permanente: boolean): Promise<void> {
    await this.db.collection(COL).doc(id).update({ permanente });
  }
}
