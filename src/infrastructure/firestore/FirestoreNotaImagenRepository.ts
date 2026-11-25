import type { Firestore } from 'firebase-admin/firestore';
import type { INotaImagenRepository } from '../../core/ports/repositories/INotaImagenRepository.js';
import type { NotaImagen } from '../../core/entities/NotaPersonal.js';

const COL = 'notas_imagenes';

const deDoc = (id: string, d: Record<string, unknown>): NotaImagen => ({
  id,
  uid: String(d.uid ?? ''),
  notaId: String(d.notaId ?? ''),
  nombre: String(d.nombre ?? 'imagen'),
  contentType: String(d.contentType ?? 'image/jpeg'),
  tamano: Number(d.tamano ?? 0),
  data: String(d.data ?? ''),
  creadaEn: new Date(typeof d.creadaEn === 'string' ? d.creadaEn : 0),
});

/** Sirve para ambos drivers (Admin SDK y REST). Fecha como texto ISO. */
export class FirestoreNotaImagenRepository implements INotaImagenRepository {
  constructor(private readonly db: Firestore) {}

  async crear(i: NotaImagen): Promise<void> {
    await this.db.collection(COL).doc(i.id).set({
      uid: i.uid,
      notaId: i.notaId,
      nombre: i.nombre,
      contentType: i.contentType,
      tamano: i.tamano,
      data: i.data,
      creadaEn: i.creadaEn.toISOString(),
    });
  }

  async obtener(id: string): Promise<NotaImagen | null> {
    const snap = await this.db.collection(COL).doc(id).get();
    return snap.exists ? deDoc(id, snap.data() ?? {}) : null;
  }

  async eliminarVarias(ids: readonly string[]): Promise<void> {
    for (const id of ids) await this.db.collection(COL).doc(id).delete();
  }

  async listarTodas(): Promise<NotaImagen[]> {
    const snap = await this.db.collection(COL).get();
    return snap.docs.map((d) => deDoc(d.id, d.data()));
  }
}
