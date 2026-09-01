import { Timestamp, type DocumentData, type Firestore } from 'firebase-admin/firestore';
import type {
  ISolicitudAccesoRepository,
  SolicitudAcceso,
} from '../../core/ports/repositories/ISolicitudAccesoRepository.js';

const COL = 'solicitudes_acceso';

const toDomain = (id: string, d: DocumentData): SolicitudAcceso => ({
  id,
  email: String(d.email ?? ''),
  nombre: String(d.nombre ?? ''),
  mensaje: d.mensaje ?? null,
  estado: (d.estado ?? 'pendiente') as SolicitudAcceso['estado'],
  createdAt: d.createdAt instanceof Timestamp ? d.createdAt.toDate() : new Date(),
});

export class FirestoreSolicitudAccesoRepository implements ISolicitudAccesoRepository {
  constructor(private readonly db: Firestore) {}

  async create(
    data: Omit<SolicitudAcceso, 'id' | 'estado' | 'createdAt'>,
  ): Promise<SolicitudAcceso> {
    const ref = this.db.collection(COL).doc();
    const doc = {
      email: data.email,
      nombre: data.nombre,
      mensaje: data.mensaje,
      estado: 'pendiente' as const,
      createdAt: Timestamp.now(),
    };
    await ref.set(doc);
    return { id: ref.id, ...doc, createdAt: doc.createdAt.toDate() };
  }

  async findByEmail(email: string): Promise<SolicitudAcceso | null> {
    const q = await this.db
      .collection(COL)
      .where('email', '==', email.trim().toLowerCase())
      .where('estado', '==', 'pendiente')
      .limit(1)
      .get();
    const doc = q.docs[0];
    return doc ? toDomain(doc.id, doc.data()) : null;
  }

  async listPendientes(): Promise<SolicitudAcceso[]> {
    const q = await this.db.collection(COL).where('estado', '==', 'pendiente').get();
    return q.docs
      .map((d) => toDomain(d.id, d.data()))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async updateEstado(id: string, estado: SolicitudAcceso['estado']): Promise<void> {
    await this.db.collection(COL).doc(id).update({ estado });
  }
}
