import { type DocumentData, type Firestore, type Query } from 'firebase-admin/firestore';
import { Timestamp } from '../../core/entities/value-objects/Timestamp.js';
import type { ICotizacionRepository, ListarCotizacionesFiltro } from '../../core/ports/repositories/ICotizacionRepository.js';
import { Cotizacion, type ConceptoCotizacion, type EstadoCotizacion } from '../../core/entities/Cotizacion.js';

const COL = 'cotizaciones';
const fecha = (v: unknown): Date => (v instanceof Timestamp ? v.toDate() : new Date());

function toDomain(id: string, d: DocumentData): Cotizacion {
  return new Cotizacion({
    id,
    folio: String(d.folio ?? id),
    empresaId: String(d.empresaId ?? ''),
    empresaNombre: d.empresaNombre ?? null,
    contactoId: d.contactoId ?? null,
    fecha: fecha(d.fecha),
    vigenciaDias: Number(d.vigenciaDias ?? 15),
    estado: (d.estado ?? 'borrador') as EstadoCotizacion,
    moneda: String(d.moneda ?? 'MXN'),
    ivaTasa: typeof d.ivaTasa === 'number' ? d.ivaTasa : 0.16,
    conceptos: Array.isArray(d.conceptos) ? (d.conceptos as ConceptoCotizacion[]) : [],
    notas: d.notas ?? null,
    condiciones: d.condiciones ?? null,
    emisorNombre: d.emisorNombre ?? null,
    emisorCargo: d.emisorCargo ?? null,
    emisorTelefono: d.emisorTelefono ?? null,
    emisorCorreo: d.emisorCorreo ?? null,
    rfc: d.rfc ?? null,
    contactoNombre: d.contactoNombre ?? null,
    contactoCorreo: d.contactoCorreo ?? null,
    contactoTelefono: d.contactoTelefono ?? null,
    origenCalculadora: Boolean(d.origenCalculadora),
    parametrosCompac: d.parametrosCompac ?? null,
    creadoPorUid: d.creadoPorUid ?? null,
    createdAt: fecha(d.createdAt),
    updatedAt: fecha(d.updatedAt),
  });
}

export class FirestoreCotizacionRepository implements ICotizacionRepository {
  constructor(private readonly db: Firestore) {}

  async findById(id: string): Promise<Cotizacion | null> {
    const s = await this.db.collection(COL).doc(id).get();
    return s.exists ? toDomain(s.id, s.data()!) : null;
  }

  async list(filtro: ListarCotizacionesFiltro = {}): Promise<Cotizacion[]> {
    let q: Query = this.db.collection(COL);
    if (filtro.empresaId) q = q.where('empresaId', '==', filtro.empresaId);
    if (filtro.estado) q = q.where('estado', '==', filtro.estado);
    const snap = await q.get();
    let cots = snap.docs.map((d) => toDomain(d.id, d.data()));
    if (filtro.texto) {
      const t = filtro.texto.toLowerCase();
      cots = cots.filter(
        (c) => c.folio.toLowerCase().includes(t) || (c.empresaNombre ?? '').toLowerCase().includes(t),
      );
    }
    cots.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
    return filtro.limite ? cots.slice(0, filtro.limite) : cots;
  }

  async save(c: Cotizacion): Promise<void> {
    await this.db.collection(COL).doc(c.id).set(
      {
        folio: c.folio,
        empresaId: c.empresaId,
        empresaNombre: c.empresaNombre,
        contactoId: c.contactoId,
        fecha: Timestamp.fromDate(c.fecha),
        vigenciaDias: c.vigenciaDias,
        estado: c.estado,
        moneda: c.moneda,
        ivaTasa: c.ivaTasa,
        conceptos: c.conceptos,
        subtotal: c.subtotal,
        iva: c.iva,
        total: c.total,
        notas: c.notas,
        condiciones: c.condiciones,
        emisorNombre: c.emisorNombre,
        emisorCargo: c.emisorCargo,
        emisorTelefono: c.emisorTelefono,
        emisorCorreo: c.emisorCorreo,
        rfc: c.rfc,
        contactoNombre: c.contactoNombre,
        contactoCorreo: c.contactoCorreo,
        contactoTelefono: c.contactoTelefono,
        origenCalculadora: c.origenCalculadora,
        parametrosCompac: c.parametrosCompac,
        creadoPorUid: c.creadoPorUid,
        createdAt: Timestamp.fromDate(c.createdAt),
        updatedAt: Timestamp.fromDate(c.updatedAt),
      },
      { merge: true },
    );
  }

  async contarPorEstado(): Promise<Record<string, number>> {
    const snap = await this.db.collection(COL).get();
    const out: Record<string, number> = {};
    for (const d of snap.docs) {
      const e = String(d.data().estado ?? 'borrador');
      out[e] = (out[e] ?? 0) + 1;
    }
    return out;
  }
}
