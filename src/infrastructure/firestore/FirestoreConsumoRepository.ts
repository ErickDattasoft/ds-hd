import type { Firestore } from 'firebase-admin/firestore';
import type { ConsumoDia, IConsumoFirestoreRepository } from '../../core/ports/repositories/IConsumoFirestoreRepository.js';
import { COLECCION_CONSUMO } from '../../core/entities/value-objects/cuotaFirestore.js';

/** Lee el documento del día que llena el medidor del Worker (ver `firestore-rest/medidorConsumo.ts`). */
export class FirestoreConsumoRepository implements IConsumoFirestoreRepository {
  constructor(private readonly db: Firestore) {}

  async delDia(dia: string): Promise<ConsumoDia | null> {
    const snap = await this.db.collection(COLECCION_CONSUMO).doc(dia).get();
    if (!snap.exists) return null;
    const d = snap.data() ?? {};
    const porHora: Record<string, number> = {};
    const horas = (d.horas ?? {}) as Record<string, unknown>;
    for (const [h, v] of Object.entries(horas)) if (Number(v) > 0) porHora[h] = Number(v);
    return { dia, lecturas: Number(d.lecturas ?? 0), porHora };
  }
}
