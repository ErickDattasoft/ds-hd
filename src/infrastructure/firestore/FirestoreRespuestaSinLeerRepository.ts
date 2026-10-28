import type { Firestore } from 'firebase-admin/firestore';
import { Timestamp } from '../../core/entities/value-objects/Timestamp.js';
import type { IRespuestaSinLeerRepository } from '../../core/ports/repositories/IRespuestaSinLeerRepository.js';
import type { RespuestaSinLeer } from '../../core/entities/RespuestaSinLeer.js';

const COL = 'respuestas_sin_leer';

interface Doc {
  numero?: number;
  asunto?: string;
  empresaNombre?: string | null;
  autorNombre?: string;
  extracto?: string;
  at?: Timestamp;
  agenteAsignadoUid?: string | null;
  agenteAsignadoNombre?: string | null;
  canalizadoA?: string | null;
}

const toDomain = (id: string, d: Doc): RespuestaSinLeer => ({
  ticketId: id,
  numero: Number(d.numero ?? 0),
  asunto: String(d.asunto ?? ''),
  empresaNombre: d.empresaNombre ?? null,
  autorNombre: String(d.autorNombre ?? ''),
  extracto: String(d.extracto ?? ''),
  at: d.at instanceof Timestamp ? d.at.toDate() : new Date(0),
  agenteAsignadoUid: d.agenteAsignadoUid ?? null,
  agenteAsignadoNombre: d.agenteAsignadoNombre ?? null,
  canalizadoA: d.canalizadoA ?? null,
});

/** Sirve para ambos drivers (Admin SDK y REST): solo get/set/delete por id y la colección entera. */
export class FirestoreRespuestaSinLeerRepository implements IRespuestaSinLeerRepository {
  constructor(private readonly db: Firestore) {}

  async guardar(r: RespuestaSinLeer): Promise<void> {
    await this.db.collection(COL).doc(r.ticketId).set({
      numero: r.numero,
      asunto: r.asunto,
      empresaNombre: r.empresaNombre,
      autorNombre: r.autorNombre,
      extracto: r.extracto,
      at: Timestamp.fromDate(r.at),
      agenteAsignadoUid: r.agenteAsignadoUid,
      agenteAsignadoNombre: r.agenteAsignadoNombre,
      canalizadoA: r.canalizadoA,
    });
  }

  async listar(): Promise<RespuestaSinLeer[]> {
    const snap = await this.db.collection(COL).get();
    return snap.docs.map((d) => toDomain(d.id, d.data() as Doc));
  }

  async quitar(ticketId: string): Promise<boolean> {
    // Se lee antes de borrar: abrir un ticket sin respuestas pendientes (lo normal) no escribe nada.
    const ref = this.db.collection(COL).doc(ticketId);
    const snap = await ref.get();
    if (!snap.exists) return false;
    await ref.delete();
    return true;
  }
}
