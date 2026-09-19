import type { Firestore } from 'firebase-admin/firestore';
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
   * Borrado permanente agrupando las llamadas: leer las dos subcolecciones de cada ticket y
   * borrar hijo por hijo son cientos de peticiones HTTP cuando se vacía la tabla entera (modo
   * "sustituir" de la importación), y un worker tiene un tope por request.
   */
  async eliminarVarios(ids: string[]): Promise<void> {
    if (!ids.length) return;
    const batch = this.db.batch();
    for (const id of ids) {
      const ref = this.db.collection(COL).doc(id);
      for (const sub of ['notas', 'eventos']) {
        const hijos = await ref.collection(sub).get();
        for (const h of hijos.docs) batch.delete(h.ref);
      }
      batch.delete(ref);
    }
    await batch.commit();
  }

  /** Ticket + sus notas + sus eventos en UNA sola escritura (ver `RestWriteBatch`). */
  async guardarConDetalle(
    ticket: Ticket,
    notas: NotaTicket[],
    eventos: EventoTicket[],
  ): Promise<void> {
    const ref = this.db.collection(COL).doc(ticket.id);
    const batch = this.db.batch();
    batch.set(ref, TicketMapper.toDocument(ticket), { merge: true });
    for (const n of notas) batch.set(ref.collection('notas').doc(n.id), TicketMapper.notaToDoc(n));
    for (const e of eventos) batch.set(ref.collection('eventos').doc(e.id), TicketMapper.eventoToDoc(e));
    await batch.commit();
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
