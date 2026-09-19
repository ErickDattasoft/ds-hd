import { type DocumentData, type Firestore, type Query } from 'firebase-admin/firestore';
import { Timestamp } from '../../core/entities/value-objects/Timestamp.js';
import type { IEmpresaRepository, ListarEmpresasFiltro } from '../../core/ports/repositories/IEmpresaRepository.js';
import { Empresa } from '../../core/entities/Empresa.js';

const COL = 'empresas';
const fecha = (v: unknown): Date | undefined => (v instanceof Timestamp ? v.toDate() : undefined);
const ts = (d: Date | null): Timestamp | null => (d ? Timestamp.fromDate(d) : null);

function toDomain(id: string, d: DocumentData): Empresa {
  return new Empresa({
    id,
    nombre: String(d.nombre ?? ''),
    rfc: d.rfc ?? null,
    razonSocial: d.razonSocial ?? null,
    direccion: d.direccion ?? null,
    telefono: d.telefono ?? null,
    email: d.email ?? null,
    sistemasContratados: Array.isArray(d.sistemasContratados) ? d.sistemasContratados.map(String) : [],
    vigencias: (d.vigencias as Record<string, string>) ?? {},
    versionesInstaladas: (d.versionesInstaladas as Record<string, string>) ?? {},
    contactoPrincipalId: d.contactoPrincipalId ?? null,
    notas: d.notas ?? null,
    activa: d.activa !== false,
    favorita: d.favorita === true,
    camposExtra: Array.isArray(d.camposExtra) ? d.camposExtra : [],
    creadoPorUid: d.creadoPorUid ?? null,
    createdAt: fecha(d.createdAt) ?? new Date(),
    updatedAt: fecha(d.updatedAt) ?? new Date(),
    ultimoAvisoVersionesEn: fecha(d.ultimoAvisoVersionesEn) ?? null,
    ultimoAvisoLicenciasEn: fecha(d.ultimoAvisoLicenciasEn) ?? null,
  });
}

export class FirestoreEmpresaRepository implements IEmpresaRepository {
  constructor(private readonly db: Firestore) {}

  async findById(id: string): Promise<Empresa | null> {
    const s = await this.db.collection(COL).doc(id).get();
    return s.exists ? toDomain(s.id, s.data()!) : null;
  }

  async contar(soloActivas = true): Promise<number> {
    let q: Query = this.db.collection(COL);
    if (soloActivas) q = q.where('activa', '==', true);
    return (await q.count().get()).data().count;
  }

  async list(filtro: ListarEmpresasFiltro = {}): Promise<Empresa[]> {
    let q: Query = this.db.collection(COL);
    if (filtro.activa !== undefined) q = q.where('activa', '==', filtro.activa);
    const snap = await q.get();
    let empresas = snap.docs.map((d) => toDomain(d.id, d.data()));
    if (filtro.texto) {
      const t = filtro.texto.toLowerCase();
      empresas = empresas.filter(
        (e) => e.nombre.toLowerCase().includes(t) || (e.rfc ?? '').toLowerCase().includes(t),
      );
    }
    if (filtro.favorita) empresas = empresas.filter((e) => e.favorita);
    if (filtro.sistema) empresas = empresas.filter((e) => e.sistemasContratados.includes(filtro.sistema!));
    return empresas.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }

  /** Documento Firestore de una empresa. Lo comparten `save` y `guardarVarias`, para que la
   *  carga masiva no se pueda desincronizar del guardado de una sola. */
  private static toDocument(empresa: Empresa): Record<string, unknown> {
    return {
      nombre: empresa.nombre,
      nombreLower: empresa.nombre.toLowerCase(),
      rfc: empresa.rfc,
      razonSocial: empresa.razonSocial,
      direccion: empresa.direccion,
      telefono: empresa.telefono,
      email: empresa.email,
      sistemasContratados: empresa.sistemasContratados,
      vigencias: empresa.vigencias,
      versionesInstaladas: empresa.versionesInstaladas,
      camposExtra: empresa.camposExtra,
      contactoPrincipalId: empresa.contactoPrincipalId,
      notas: empresa.notas,
      activa: empresa.activa,
      favorita: empresa.favorita,
      creadoPorUid: empresa.creadoPorUid,
      createdAt: Timestamp.fromDate(empresa.createdAt),
      updatedAt: Timestamp.fromDate(empresa.updatedAt),
      ultimoAvisoVersionesEn: ts(empresa.ultimoAvisoVersionesEn),
      ultimoAvisoLicenciasEn: ts(empresa.ultimoAvisoLicenciasEn),
    };
  }

  async save(empresa: Empresa): Promise<void> {
    await this.db
      .collection(COL)
      .doc(empresa.id)
      .set(FirestoreEmpresaRepository.toDocument(empresa), { merge: true });
  }

  /** Una sola llamada HTTP por cada 500, en vez de una por empresa (ver `RestWriteBatch`). */
  async guardarVarias(empresas: Empresa[]): Promise<void> {
    if (!empresas.length) return;
    const batch = this.db.batch();
    for (const empresa of empresas) {
      batch.set(this.db.collection(COL).doc(empresa.id), FirestoreEmpresaRepository.toDocument(empresa), {
        merge: true,
      });
    }
    await batch.commit();
  }

  async eliminar(id: string): Promise<void> {
    await this.db.collection(COL).doc(id).delete();
  }

  /** Borra muchos de golpe: uno por uno son tantas peticiones HTTP como empresas, y una carga
   *  masiva (modo "sustituir" de la importación) se come el presupuesto del worker. */
  async eliminarVarias(ids: string[]): Promise<void> {
    if (!ids.length) return;
    const batch = this.db.batch();
    for (const id of ids) batch.delete(this.db.collection(COL).doc(id));
    await batch.commit();
  }

  async existePorNombre(nombre: string, exceptoId?: string): Promise<boolean> {
    const q = await this.db
      .collection(COL)
      .where('nombreLower', '==', nombre.trim().toLowerCase())
      .get();
    return q.docs.some((d) => d.id !== exceptoId);
  }
}
