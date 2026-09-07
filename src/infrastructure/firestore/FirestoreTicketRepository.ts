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
    const ref = this.db.collection(COL).doc(id);
    for (const sub of ['notas', 'eventos']) {
      const hijos = await ref.collection(sub).get();
      await Promise.all(hijos.docs.map((h) => h.ref.delete()));
    }
    await ref.delete();
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
