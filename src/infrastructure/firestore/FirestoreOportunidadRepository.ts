import type { DocumentData, Firestore } from 'firebase-admin/firestore';
import { Timestamp } from '../../core/entities/value-objects/Timestamp.js';
import type { IOportunidadRepository } from '../../core/ports/repositories/IOportunidadRepository.js';
import { Oportunidad, esEtapa } from '../../core/entities/Oportunidad.js';

const COL = 'oportunidades';
const fecha = (v: unknown): Date | null => (v instanceof Timestamp ? v.toDate() : null);

function toDomain(id: string, d: DocumentData): Oportunidad {
  return new Oportunidad({
    id,
    titulo: String(d.titulo ?? '(sin título)'),
    empresaId: d.empresaId ?? null,
    empresaNombre: d.empresaNombre ?? null,
    monto: Number(d.monto ?? 0),
    etapa: esEtapa(String(d.etapa)) ? d.etapa : 'prospecto',
    cierreEstimado: fecha(d.cierreEstimado),
    responsableUid: d.responsableUid ?? null,
    responsableNombre: d.responsableNombre ?? null,
    cotizacionId: d.cotizacionId ?? null,
    notas: d.notas ?? null,
    motivoPerdida: d.motivoPerdida ?? null,
    createdAt: fecha(d.createdAt) ?? new Date(0),
    updatedAt: fecha(d.updatedAt) ?? new Date(0),
  });
}

/** Colección plana; se lista completa y se ordena en memoria (volumen bajo). */
export class FirestoreOportunidadRepository implements IOportunidadRepository {
  constructor(private readonly db: Firestore) {}

  async findById(id: string): Promise<Oportunidad | null> {
    const s = await this.db.collection(COL).doc(id).get();
    return s.exists ? toDomain(s.id, s.data()!) : null;
  }

  async list(): Promise<Oportunidad[]> {
    const snap = await this.db.collection(COL).get();
    return snap.docs.map((d) => toDomain(d.id, d.data())).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async save(o: Oportunidad): Promise<void> {
    await this.db.collection(COL).doc(o.id).set({
      titulo: o.titulo,
      empresaId: o.empresaId,
      empresaNombre: o.empresaNombre,
      monto: o.monto,
      etapa: o.etapa,
      cierreEstimado: o.cierreEstimado ? Timestamp.fromDate(o.cierreEstimado) : null,
      responsableUid: o.responsableUid,
      responsableNombre: o.responsableNombre,
      cotizacionId: o.cotizacionId,
      notas: o.notas,
      motivoPerdida: o.motivoPerdida,
      createdAt: Timestamp.fromDate(o.createdAt),
      updatedAt: Timestamp.fromDate(o.updatedAt),
    });
  }

  async delete(id: string): Promise<void> {
    await this.db.collection(COL).doc(id).delete();
  }
}
