import { Timestamp, type DocumentData, type Firestore } from 'firebase-admin/firestore';
import type { ITicketPublicoRepository } from '../../core/ports/repositories/ITicketPublicoRepository.js';
import type { TicketPublico } from '../../core/entities/TicketPublico.js';

const COL = 'tickets_publicos';

const toDomain = (id: string, d: DocumentData): TicketPublico => ({
  id,
  folio: String(d.folio ?? id),
  nombre: String(d.nombre ?? ''),
  empresa: d.empresa ?? null,
  correo: String(d.correo ?? ''),
  telefono: d.telefono ?? null,
  asunto: String(d.asunto ?? ''),
  sistema: d.sistema ?? null,
  tipo: d.tipo ?? null,
  prioridad: String(d.prioridad ?? 'Media'),
  descripcion: String(d.descripcion ?? ''),
  estado: (d.estado ?? 'pendiente') as TicketPublico['estado'],
  ticketNumero: d.ticketNumero ?? null,
  createdAt: d.createdAt instanceof Timestamp ? d.createdAt.toDate() : new Date(),
});

export class FirestoreTicketPublicoRepository implements ITicketPublicoRepository {
  constructor(private readonly db: Firestore) {}

  async create(
    data: Omit<TicketPublico, 'id' | 'estado' | 'ticketNumero' | 'createdAt'>,
  ): Promise<TicketPublico> {
    const ref = this.db.collection(COL).doc();
    const doc = { ...data, estado: 'pendiente' as const, ticketNumero: null, createdAt: Timestamp.now() };
    await ref.set(doc);
    return toDomain(ref.id, doc);
  }

  async findById(id: string): Promise<TicketPublico | null> {
    const snap = await this.db.collection(COL).doc(id).get();
    return snap.exists ? toDomain(snap.id, snap.data()!) : null;
  }

  async listPendientes(): Promise<TicketPublico[]> {
    const snap = await this.db.collection(COL).where('estado', '==', 'pendiente').get();
    return snap.docs
      .map((d) => toDomain(d.id, d.data()))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async marcarAceptado(id: string, ticketNumero: number): Promise<void> {
    await this.db.collection(COL).doc(id).update({ estado: 'aceptado', ticketNumero });
  }

  async marcarRechazado(id: string): Promise<void> {
    await this.db.collection(COL).doc(id).update({ estado: 'rechazado' });
  }
}
