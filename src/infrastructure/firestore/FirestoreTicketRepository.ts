import type { DocumentData, DocumentReference, Firestore, WriteBatch } from 'firebase-admin/firestore';
import type { ITicketRepository } from '../../core/ports/repositories/ITicketRepository.js';
import type { Ticket } from '../../core/entities/Ticket.js';
import type { EventoTicket, NotaTicket } from '../../core/entities/NotaTicket.js';
import { TicketMapper } from './mappers/TicketMapper.js';

const COL = 'tickets';

/** Implementación Firestore de {@link ITicketRepository} (`tickets/{id}` + subcolecciones). */
export class FirestoreTicketRepository implements ITicketRepository {
  constructor(private readonly db: Firestore) {}

  async findById(id: string): Promise<Ticket | null> {
    const snap = await this.db.collection(COL).doc(id).get();
    return snap.exists ? TicketMapper.toDomain(snap.id, snap.data()!) : null;
  }

  async findByNumero(numero: number): Promise<Ticket | null> {
    const q = await this.db.collection(COL).where('numero', '==', numero).limit(1).get();
    const doc = q.docs[0];
    return doc ? TicketMapper.toDomain(doc.id, doc.data()) : null;
  }

  async save(ticket: Ticket): Promise<void> {
    await this.db.collection(COL).doc(ticket.id).set(TicketMapper.toDocument(ticket), { merge: true });
  }

  async eliminar(id: string): Promise<void> {
    await this.eliminarVarios([id]);
  }

  /**
   * Borrado permanente de varios tickets con sus notas y eventos.
   *
   * El coste está en las LECTURAS: preguntar por las dos subcolecciones de cada ticket son dos
   * peticiones por ticket (112 para vaciar una tabla de 56), y un worker tiene un tope por
   * request bastante más bajo que eso. Con una consulta de grupo por subcolección son dos
   * lecturas en total, se filtran por ticket en memoria y los borrados van en tandas.
   */
  async eliminarVarios(ids: string[]): Promise<void> {
    if (!ids.length) return;
    const objetivo = new Set(ids);
    const refs = [];
    for (const sub of ['notas', 'eventos']) {
      const hijos = await this.db.collectionGroup(sub).get();
      for (const h of hijos.docs) {
        // `tickets/<id>/<sub>/<doc>`: solo los hijos de los tickets que se están borrando.
        const partes = h.ref.path.split('/');
        if (partes[0] === COL && objetivo.has(partes[1] ?? '')) refs.push(h.ref);
      }
    }
    for (const id of ids) refs.push(this.db.collection(COL).doc(id));
    await this.enTandas(refs, (batch, ref) => batch.delete(ref));
  }

  /** Ticket + sus notas + sus eventos en una sola escritura. */
  async guardarConDetalle(
    ticket: Ticket,
    notas: NotaTicket[],
    eventos: EventoTicket[],
  ): Promise<void> {
    await this.guardarVariosConDetalle([{ ticket, notas, eventos }]);
  }

  /**
   * Muchos tickets con su detalle, agrupados en tandas de 500 escrituras.
   *
   * Un commit por ticket ya eran 56 peticiones en el respaldo real, por encima del tope de
   * subpeticiones de un worker por sí solas. Así, los 56 tickets con sus 148 entradas de
   * actividad caben en una sola llamada.
   */
  async guardarVariosConDetalle(
    items: { ticket: Ticket; notas: NotaTicket[]; eventos: EventoTicket[] }[],
  ): Promise<void> {
    const escrituras: { ref: DocumentReference; datos: DocumentData; merge: boolean }[] = [];
    for (const { ticket, notas, eventos } of items) {
      const ref = this.db.collection(COL).doc(ticket.id);
      escrituras.push({ ref, datos: TicketMapper.toDocument(ticket), merge: true });
      for (const n of notas) {
        escrituras.push({ ref: ref.collection('notas').doc(n.id), datos: TicketMapper.notaToDoc(n), merge: false });
      }
      for (const e of eventos) {
        escrituras.push({ ref: ref.collection('eventos').doc(e.id), datos: TicketMapper.eventoToDoc(e), merge: false });
      }
    }
    await this.enTandas(escrituras, (batch, w) => batch.set(w.ref, w.datos, { merge: w.merge }));
  }

  /** Aplica `op` a cada elemento repartiéndolos en lotes de 500 (el máximo de un commit). */
  private async enTandas<T>(items: T[], op: (batch: WriteBatch, item: T) => void): Promise<void> {
    for (let i = 0; i < items.length; i += 500) {
      const batch = this.db.batch();
      for (const item of items.slice(i, i + 500)) op(batch, item);
      await batch.commit();
    }
  }

  async agregarNota(ticketId: string, nota: NotaTicket): Promise<void> {
    await this.db
      .collection(COL)
      .doc(ticketId)
      .collection('notas')
      .doc(nota.id)
      .set(TicketMapper.notaToDoc(nota));
  }

  async listarNotas(ticketId: string): Promise<NotaTicket[]> {
    const snap = await this.db
      .collection(COL)
      .doc(ticketId)
      .collection('notas')
      .orderBy('createdAt', 'asc')
      .get();
    return snap.docs.map((d) => TicketMapper.notaToDomain(d.id, d.data()));
  }

  async registrarEvento(ticketId: string, evento: EventoTicket): Promise<void> {
    await this.db
      .collection(COL)
      .doc(ticketId)
      .collection('eventos')
      .doc(evento.id)
      .set(TicketMapper.eventoToDoc(evento));
  }

  async listarEventos(ticketId: string): Promise<EventoTicket[]> {
    const snap = await this.db
      .collection(COL)
      .doc(ticketId)
      .collection('eventos')
      .orderBy('at', 'asc')
      .get();
    return snap.docs.map((d) => TicketMapper.eventoToDomain(d.id, d.data()));
  }
}
