import type { Firestore } from 'firebase-admin/firestore';
import { Timestamp } from '../../core/entities/value-objects/Timestamp.js';
import type { IAdjuntoTicketRepository } from '../../core/ports/repositories/IAdjuntoTicketRepository.js';
import type { AdjuntoTicket, AdjuntoTicketMeta } from '../../core/entities/AdjuntoTicket.js';

const COL = 'tickets_adjuntos';
/**
 * Un doc de Firestore no pasa de 1 MiB: un archivo más grande (p. ej. una foto adjunta a un
 * correo) se guarda en trozos en `tickets_adjuntos/{id}/partes/{n}` y se vuelve a unir al leerlo.
 */
const PARTES = 'partes';
const TAMANO_PARTE = 900_000;

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
  /** Cuántos trozos tiene `data` en la subcolección `partes` (0/ausente = va completo en el doc). */
  partes?: number;
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
    const trozos: string[] = [];
    if (a.data.length > TAMANO_PARTE) {
      for (let i = 0; i < a.data.length; i += TAMANO_PARTE) trozos.push(a.data.slice(i, i + TAMANO_PARTE));
      const ref = this.db.collection(COL).doc(a.id);
      // Primero los trozos: si algo falla a medias, no queda un adjunto que diga tener partes que no existen.
      for (const [n, data] of trozos.entries()) await ref.collection(PARTES).doc(String(n)).set({ data });
    }
    await this.db
      .collection(COL)
      .doc(a.id)
      .set({
        ticketId: a.ticketId,
        nombre: a.nombre,
        contentType: a.contentType,
        tamano: a.tamano,
        data: trozos.length ? '' : a.data,
        ...(trozos.length ? { partes: trozos.length } : {}),
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
    return { ...meta(id, d), data: await this.datos(id, d) };
  }

  /** El contenido completo: el del doc o, si va en trozos, los trozos unidos en orden. */
  private async datos(id: string, d: Doc): Promise<string> {
    const n = Number(d.partes ?? 0);
    if (!n) return String(d.data ?? '');
    const ref = this.db.collection(COL).doc(id).collection(PARTES);
    const trozos = await Promise.all(
      Array.from({ length: n }, (_, i) => ref.doc(String(i)).get().then((s) => String((s.data() as Doc | undefined)?.data ?? ''))),
    );
    return trozos.join('');
  }

  private async borrar(id: string, d?: Doc): Promise<void> {
    const ref = this.db.collection(COL).doc(id);
    const datos = d ?? ((await ref.get()).data() as Doc | undefined);
    const n = Number(datos?.partes ?? 0);
    await Promise.all(Array.from({ length: n }, (_, i) => ref.collection(PARTES).doc(String(i)).delete()));
    await ref.delete();
  }

  async eliminar(id: string): Promise<void> {
    await this.borrar(id);
  }

  async eliminarPorTicket(ticketId: string): Promise<void> {
    const snap = await this.db.collection(COL).where('ticketId', '==', ticketId).get();
    await Promise.all(snap.docs.map((d) => this.borrar(d.id, d.data() as Doc)));
  }

  async sumarBytesTotal(): Promise<number> {
    const snap = await this.db.collection(COL).select('tamano').get();
    return snap.docs.reduce((total, d) => total + Number((d.data() as Doc).tamano ?? 0), 0);
  }

  async listarImagenes(): Promise<AdjuntoTicket[]> {
    const snap = await this.db.collection(COL).get();
    const todos = await Promise.all(
      snap.docs.map(async (d) => ({ ...meta(d.id, d.data() as Doc), data: await this.datos(d.id, d.data() as Doc) })),
    );
    return todos.filter((a) => a.contentType.startsWith('image/') && a.data.startsWith('data:'));
  }

  async listarTodosMeta(): Promise<AdjuntoTicketMeta[]> {
    const snap = await this.db.collection(COL).select(...CAMPOS_META).get();
    return snap.docs.map((d) => meta(d.id, d.data() as Doc));
  }

  async marcarPermanente(id: string, permanente: boolean): Promise<void> {
    await this.db.collection(COL).doc(id).update({ permanente });
  }
}
