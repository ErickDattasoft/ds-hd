import { type DocumentData, type Firestore, type Query } from 'firebase-admin/firestore';
import { Timestamp } from '../../core/entities/value-objects/Timestamp.js';
import type { IContactoRepository, ListarContactosFiltro } from '../../core/ports/repositories/IContactoRepository.js';
import { Contacto } from '../../core/entities/Contacto.js';

const COL = 'contactos';
const fecha = (v: unknown): Date | undefined => (v instanceof Timestamp ? v.toDate() : undefined);

function toDomain(id: string, d: DocumentData): Contacto {
  return new Contacto({
    id,
    nombre: String(d.nombre ?? ''),
    empresaId: String(d.empresaId ?? ''),
    puesto: d.puesto ?? null,
    email: d.email ?? null,
    telefono: d.telefono ?? null,
    celular: d.celular ?? null,
    esPortal: Boolean(d.esPortal),
    uid: d.uid ?? null,
    notas: d.notas ?? null,
    activo: d.activo !== false,
    createdAt: fecha(d.createdAt) ?? new Date(),
    updatedAt: fecha(d.updatedAt) ?? new Date(),
  });
}

export class FirestoreContactoRepository implements IContactoRepository {
  constructor(private readonly db: Firestore) {}

  async findById(id: string): Promise<Contacto | null> {
    const s = await this.db.collection(COL).doc(id).get();
    return s.exists ? toDomain(s.id, s.data()!) : null;
  }

  async findByUid(uid: string): Promise<Contacto | null> {
    const q = await this.db.collection(COL).where('uid', '==', uid).limit(1).get();
    const doc = q.docs[0];
    return doc ? toDomain(doc.id, doc.data()) : null;
  }

  async findByEmail(email: string): Promise<Contacto | null> {
    const q = await this.db.collection(COL).where('email', '==', email.trim().toLowerCase()).limit(1).get();
    const doc = q.docs[0];
    return doc ? toDomain(doc.id, doc.data()) : null;
  }

  async list(filtro: ListarContactosFiltro = {}): Promise<Contacto[]> {
    let q: Query = this.db.collection(COL);
    if (filtro.empresaId) q = q.where('empresaId', '==', filtro.empresaId);
    if (filtro.activo !== undefined) q = q.where('activo', '==', filtro.activo);
    if (filtro.esPortal !== undefined) q = q.where('esPortal', '==', filtro.esPortal);
    const snap = await q.get();
    let contactos = snap.docs.map((d) => toDomain(d.id, d.data()));
    if (filtro.texto) {
      const t = filtro.texto.toLowerCase();
      contactos = contactos.filter(
        (c) => c.nombre.toLowerCase().includes(t) || (c.email ?? '').includes(t),
      );
    }
    return contactos.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }

  async save(c: Contacto): Promise<void> {
    await this.db.collection(COL).doc(c.id).set(
      {
        nombre: c.nombre,
        empresaId: c.empresaId,
        puesto: c.puesto,
        email: c.email,
        telefono: c.telefono,
        celular: c.celular,
        esPortal: c.esPortal,
        uid: c.uid,
        notas: c.notas,
        activo: c.activo,
        createdAt: Timestamp.fromDate(c.createdAt),
        updatedAt: Timestamp.fromDate(c.updatedAt),
      },
      { merge: true },
    );
  }

  async eliminar(id: string): Promise<void> {
    await this.db.collection(COL).doc(id).delete();
  }

  async contarPorEmpresa(empresaId: string): Promise<number> {
    const agg = await this.db.collection(COL).where('empresaId', '==', empresaId).count().get();
    return agg.data().count;
  }
}
