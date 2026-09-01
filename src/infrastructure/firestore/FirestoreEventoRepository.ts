import { createHash } from 'node:crypto';
import { Timestamp, type DocumentData, type Firestore, type Query } from 'firebase-admin/firestore';
import type {
  IEventoRepository,
  IInscripcionRepository,
  IListaNegraRepository,
} from '../../core/ports/repositories/IEventoRepository.js';
import { Evento, type EstadoEvento } from '../../core/entities/Evento.js';
import type { EntradaListaNegra, EstadoInscripcion, Inscripcion } from '../../core/entities/Inscripcion.js';

const fecha = (v: unknown): Date => (v instanceof Timestamp ? v.toDate() : new Date());
const hashEmail = (email: string): string =>
  createHash('sha256').update(email.trim().toLowerCase()).digest('hex').slice(0, 32);

const eventoToDomain = (id: string, d: DocumentData): Evento =>
  new Evento({
    id,
    titulo: String(d.titulo ?? ''),
    descripcion: d.descripcion ?? null,
    fechaHora: fecha(d.fechaHora),
    cupo: Number(d.cupo ?? 0),
    estado: (d.estado ?? 'borrador') as EstadoEvento,
    urlWebinar: d.urlWebinar ?? null,
    horasRecordatorio: Number(d.horasRecordatorio ?? 24),
    creadoPorUid: d.creadoPorUid ?? null,
    createdAt: fecha(d.createdAt),
    updatedAt: fecha(d.updatedAt),
  });

export class FirestoreEventoRepository implements IEventoRepository {
  constructor(private readonly db: Firestore) {}

  async findById(id: string): Promise<Evento | null> {
    const s = await this.db.collection('eventos').doc(id).get();
    return s.exists ? eventoToDomain(s.id, s.data()!) : null;
  }

  async list(soloPublicados = false): Promise<Evento[]> {
    let q: Query = this.db.collection('eventos');
    if (soloPublicados) q = q.where('estado', '==', 'publicado');
    const snap = await q.get();
    return snap.docs
      .map((d) => eventoToDomain(d.id, d.data()))
      .sort((a, b) => b.fechaHora.getTime() - a.fechaHora.getTime());
  }

  async proximos(desde: Date, hasta: Date): Promise<Evento[]> {
    const snap = await this.db
      .collection('eventos')
      .where('estado', '==', 'publicado')
      .where('fechaHora', '>=', Timestamp.fromDate(desde))
      .where('fechaHora', '<=', Timestamp.fromDate(hasta))
      .get();
    return snap.docs.map((d) => eventoToDomain(d.id, d.data()));
  }

  async save(e: Evento): Promise<void> {
    await this.db.collection('eventos').doc(e.id).set(
      {
        titulo: e.titulo,
        descripcion: e.descripcion,
        fechaHora: Timestamp.fromDate(e.fechaHora),
        cupo: e.cupo,
        estado: e.estado,
        urlWebinar: e.urlWebinar,
        horasRecordatorio: e.horasRecordatorio,
        creadoPorUid: e.creadoPorUid,
        createdAt: Timestamp.fromDate(e.createdAt),
        updatedAt: Timestamp.fromDate(e.updatedAt),
      },
      { merge: true },
    );
  }
}

const inscripcionToDomain = (eventoId: string, id: string, d: DocumentData): Inscripcion => ({
  id,
  eventoId,
  nombre: String(d.nombre ?? ''),
  email: String(d.email ?? ''),
  telefono: d.telefono ?? null,
  empresa: d.empresa ?? null,
  estado: (d.estado ?? 'registrado') as EstadoInscripcion,
  origen: d.origen === 'staff' ? 'staff' : 'publico',
  correoEstado: d.correoEstado ?? null,
  recordatoriosEnviados: Array.isArray(d.recordatoriosEnviados) ? d.recordatoriosEnviados.map(String) : [],
  createdAt: fecha(d.createdAt),
});

export class FirestoreInscripcionRepository implements IInscripcionRepository {
  constructor(private readonly db: Firestore) {}

  private col(eventoId: string) {
    return this.db.collection('eventos').doc(eventoId).collection('inscripciones');
  }

  async create(i: Inscripcion): Promise<void> {
    await this.save(i);
  }

  async save(i: Inscripcion): Promise<void> {
    await this.col(i.eventoId).doc(i.id).set(
      {
        nombre: i.nombre,
        email: i.email,
        telefono: i.telefono,
        empresa: i.empresa,
        estado: i.estado,
        origen: i.origen,
        correoEstado: i.correoEstado,
        recordatoriosEnviados: i.recordatoriosEnviados,
        createdAt: Timestamp.fromDate(i.createdAt),
      },
      { merge: true },
    );
  }

  async findByEmail(eventoId: string, email: string): Promise<Inscripcion | null> {
    const q = await this.col(eventoId).where('email', '==', email.trim().toLowerCase()).limit(1).get();
    const doc = q.docs[0];
    return doc ? inscripcionToDomain(eventoId, doc.id, doc.data()) : null;
  }

  async findGlobal(inscripcionId: string): Promise<Inscripcion | null> {
    // El webhook de Brevo trae el id de la inscripción en un tag; se busca en todos los eventos.
    const snap = await this.db.collectionGroup('inscripciones').get();
    const doc = snap.docs.find((d) => d.id === inscripcionId);
    if (!doc) return null;
    return inscripcionToDomain(doc.ref.parent.parent?.id ?? '', doc.id, doc.data());
  }

  async listPorEvento(eventoId: string): Promise<Inscripcion[]> {
    const snap = await this.col(eventoId).get();
    return snap.docs
      .map((d) => inscripcionToDomain(eventoId, d.id, d.data()))
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async contar(eventoId: string): Promise<number> {
    const agg = await this.col(eventoId).count().get();
    return agg.data().count;
  }
}

export class FirestoreListaNegraRepository implements IListaNegraRepository {
  constructor(private readonly db: Firestore) {}

  async contiene(email: string): Promise<boolean> {
    const s = await this.db.collection('lista_negra_eventos').doc(hashEmail(email)).get();
    return s.exists;
  }

  async list(): Promise<EntradaListaNegra[]> {
    const snap = await this.db.collection('lista_negra_eventos').get();
    return snap.docs
      .map((d) => ({
        email: String(d.data().email ?? ''),
        motivo: d.data().motivo ?? null,
        createdAt: fecha(d.data().createdAt),
      }))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async agregar(entrada: EntradaListaNegra): Promise<void> {
    await this.db.collection('lista_negra_eventos').doc(hashEmail(entrada.email)).set({
      email: entrada.email.trim().toLowerCase(),
      motivo: entrada.motivo,
      createdAt: Timestamp.fromDate(entrada.createdAt),
    });
  }

  async quitar(email: string): Promise<void> {
    await this.db.collection('lista_negra_eventos').doc(hashEmail(email)).delete();
  }
}
