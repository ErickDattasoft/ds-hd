import { type DocumentData, type Firestore, type Query } from 'firebase-admin/firestore';
import { Timestamp } from '../../core/entities/value-objects/Timestamp.js';
import type { IKnowledgeRepository, ListarKBFiltro } from '../../core/ports/repositories/IKnowledgeRepository.js';
import { ArticuloKB, type VisibilidadKB } from '../../core/entities/ArticuloKB.js';

const COL = 'knowledge_base';
const fecha = (v: unknown): Date | undefined => (v instanceof Timestamp ? v.toDate() : undefined);

const toDomain = (id: string, d: DocumentData): ArticuloKB =>
  new ArticuloKB({
    id,
    titulo: String(d.titulo ?? ''),
    slug: String(d.slug ?? ''),
    categoria: d.categoria ?? null,
    cuerpoMarkdown: String(d.cuerpoMarkdown ?? ''),
    tags: Array.isArray(d.tags) ? d.tags.map(String) : [],
    publicado: Boolean(d.publicado),
    visibilidad: (d.visibilidad ?? 'staff') as VisibilidadKB,
    autorUid: d.autorUid ?? null,
    autorNombre: d.autorNombre ?? null,
    createdAt: fecha(d.createdAt) ?? new Date(),
    updatedAt: fecha(d.updatedAt) ?? new Date(),
  });

export class FirestoreKnowledgeRepository implements IKnowledgeRepository {
  constructor(private readonly db: Firestore) {}

  async findById(id: string): Promise<ArticuloKB | null> {
    const s = await this.db.collection(COL).doc(id).get();
    return s.exists ? toDomain(s.id, s.data()!) : null;
  }

  async findBySlug(slug: string): Promise<ArticuloKB | null> {
    const q = await this.db.collection(COL).where('slug', '==', slug).limit(1).get();
    const doc = q.docs[0];
    return doc ? toDomain(doc.id, doc.data()) : null;
  }

  async list(filtro: ListarKBFiltro = {}): Promise<ArticuloKB[]> {
    let q: Query = this.db.collection(COL);
    if (filtro.publicado !== undefined) q = q.where('publicado', '==', filtro.publicado);
    if (filtro.categoria) q = q.where('categoria', '==', filtro.categoria);
    const snap = await q.get();
    let arts = snap.docs.map((d) => toDomain(d.id, d.data()));
    if (filtro.texto) {
      const t = filtro.texto.toLowerCase();
      arts = arts.filter(
        (a) => a.titulo.toLowerCase().includes(t) || a.tags.some((tag) => tag.includes(t)),
      );
    }
    return arts.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async save(a: ArticuloKB): Promise<void> {
    await this.db.collection(COL).doc(a.id).set(
      {
        titulo: a.titulo,
        slug: a.slug,
        categoria: a.categoria,
        cuerpoMarkdown: a.cuerpoMarkdown,
        tags: a.tags,
        publicado: a.publicado,
        visibilidad: a.visibilidad,
        autorUid: a.autorUid,
        autorNombre: a.autorNombre,
        createdAt: Timestamp.fromDate(a.createdAt),
        updatedAt: Timestamp.fromDate(a.updatedAt),
      },
      { merge: true },
    );
  }

  async eliminar(id: string): Promise<void> {
    await this.db.collection(COL).doc(id).delete();
  }
}
