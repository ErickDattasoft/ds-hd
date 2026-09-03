import { type Firestore } from 'firebase-admin/firestore';
import { Timestamp } from '../../core/entities/value-objects/Timestamp.js';
import type {
  IInvitacionRepository,
  Invitacion,
} from '../../core/ports/repositories/IInvitacionRepository.js';

const COL = 'invitaciones';
const ts = (v: unknown): Date => (v instanceof Timestamp ? v.toDate() : new Date(0));

export class FirestoreInvitacionRepository implements IInvitacionRepository {
  constructor(private readonly db: Firestore) {}

  async create(data: Omit<Invitacion, 'usadaEn'>): Promise<void> {
    await this.db.collection(COL).doc(data.token).set({
      uid: data.uid,
      email: data.email,
      invitadoPor: data.invitadoPor,
      createdAt: Timestamp.fromDate(data.createdAt),
      expiresAt: Timestamp.fromDate(data.expiresAt),
      usadaEn: null,
    });
  }

  async findByToken(token: string): Promise<Invitacion | null> {
    const snap = await this.db.collection(COL).doc(token).get();
    if (!snap.exists) return null;
    const d = snap.data()!;
    return {
      token: snap.id,
      uid: String(d.uid),
      email: String(d.email),
      invitadoPor: String(d.invitadoPor ?? ''),
      createdAt: ts(d.createdAt),
      expiresAt: ts(d.expiresAt),
      usadaEn: d.usadaEn instanceof Timestamp ? d.usadaEn.toDate() : null,
    };
  }

  async marcarUsada(token: string, cuando: Date): Promise<void> {
    await this.db.collection(COL).doc(token).update({ usadaEn: Timestamp.fromDate(cuando) });
  }
}
