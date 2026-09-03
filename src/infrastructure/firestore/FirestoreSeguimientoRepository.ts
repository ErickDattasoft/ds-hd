import { type DocumentData, type Firestore, type Query } from 'firebase-admin/firestore';
import { Timestamp } from '../../core/entities/value-objects/Timestamp.js';
import type {
  IInteraccionRepository,
  ITareaRepository,
  ListarTareasFiltro,
} from '../../core/ports/repositories/ISeguimientoRepository.js';
import { Interaccion, type TipoInteraccion } from '../../core/entities/Interaccion.js';
import { Tarea } from '../../core/entities/Tarea.js';

const fecha = (v: unknown): Date => (v instanceof Timestamp ? v.toDate() : new Date());

const interaccionToDomain = (id: string, d: DocumentData): Interaccion =>
  new Interaccion({
    id,
    empresaId: String(d.empresaId ?? ''),
    contactoId: d.contactoId ?? null,
    tipo: (d.tipo ?? 'nota') as TipoInteraccion,
    fecha: fecha(d.fecha),
    resumen: String(d.resumen ?? ''),
    creadoPorUid: d.creadoPorUid ?? null,
    creadoPorNombre: d.creadoPorNombre ?? null,
    createdAt: fecha(d.createdAt),
  });

export class FirestoreInteraccionRepository implements IInteraccionRepository {
  constructor(private readonly db: Firestore) {}

  async create(i: Interaccion): Promise<void> {
    await this.db.collection('interacciones').doc(i.id).set({
      empresaId: i.empresaId,
      contactoId: i.contactoId,
      tipo: i.tipo,
      fecha: Timestamp.fromDate(i.fecha),
      resumen: i.resumen,
      creadoPorUid: i.creadoPorUid,
      creadoPorNombre: i.creadoPorNombre,
      createdAt: Timestamp.fromDate(i.createdAt),
    });
  }

  async listPorEmpresa(empresaId: string): Promise<Interaccion[]> {
    const snap = await this.db.collection('interacciones').where('empresaId', '==', empresaId).get();
    return snap.docs
      .map((d) => interaccionToDomain(d.id, d.data()))
      .sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
  }

  async listRecientes(limite: number): Promise<Interaccion[]> {
    const snap = await this.db.collection('interacciones').orderBy('fecha', 'desc').limit(limite).get();
    return snap.docs.map((d) => interaccionToDomain(d.id, d.data()));
  }
}

const tareaToDomain = (id: string, d: DocumentData): Tarea =>
  new Tarea({
    id,
    titulo: String(d.titulo ?? ''),
    descripcion: d.descripcion ?? null,
    empresaId: d.empresaId ?? null,
    contactoId: d.contactoId ?? null,
    ticketId: d.ticketId ?? null,
    asignadoAUid: String(d.asignadoAUid ?? ''),
    asignadoANombre: d.asignadoANombre ?? null,
    vence: d.vence ?? null,
    completada: Boolean(d.completada),
    completadaEn: d.completadaEn instanceof Timestamp ? d.completadaEn.toDate() : null,
    creadoPorUid: d.creadoPorUid ?? null,
    createdAt: fecha(d.createdAt),
    updatedAt: fecha(d.updatedAt),
  });

export class FirestoreTareaRepository implements ITareaRepository {
  constructor(private readonly db: Firestore) {}

  async findById(id: string): Promise<Tarea | null> {
    const s = await this.db.collection('tareas').doc(id).get();
    return s.exists ? tareaToDomain(s.id, s.data()!) : null;
  }

  async list(filtro: ListarTareasFiltro = {}): Promise<Tarea[]> {
    let q: Query = this.db.collection('tareas');
    if (filtro.asignadoAUid) q = q.where('asignadoAUid', '==', filtro.asignadoAUid);
    if (filtro.completada !== undefined) q = q.where('completada', '==', filtro.completada);
    if (filtro.empresaId) q = q.where('empresaId', '==', filtro.empresaId);
    const snap = await q.get();
    return snap.docs
      .map((d) => tareaToDomain(d.id, d.data()))
      .sort((a, b) => (a.vence ?? '9999').localeCompare(b.vence ?? '9999'));
  }

  async save(t: Tarea): Promise<void> {
    await this.db.collection('tareas').doc(t.id).set(
      {
        titulo: t.titulo,
        descripcion: t.descripcion,
        empresaId: t.empresaId,
        contactoId: t.contactoId,
        ticketId: t.ticketId,
        asignadoAUid: t.asignadoAUid,
        asignadoANombre: t.asignadoANombre,
        vence: t.vence,
        completada: t.completada,
        completadaEn: t.completadaEn ? Timestamp.fromDate(t.completadaEn) : null,
        creadoPorUid: t.creadoPorUid,
        createdAt: Timestamp.fromDate(t.createdAt),
        updatedAt: Timestamp.fromDate(t.updatedAt),
      },
      { merge: true },
    );
  }
}
