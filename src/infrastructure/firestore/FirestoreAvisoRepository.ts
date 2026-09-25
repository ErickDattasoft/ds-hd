import { type DocumentData, type Firestore } from 'firebase-admin/firestore';
import { Timestamp } from '../../core/entities/value-objects/Timestamp.js';
import type { IAvisoRepository } from '../../core/ports/repositories/IAvisoRepository.js';
import {
  avisoCoincide,
  type AvisoEnviado,
  type CanalAvisoEnviado,
  type FiltroAvisos,
  type TipoAvisoEnviado,
} from '../../core/entities/AvisoEnviado.js';

const fecha = (v: unknown): Date => (v instanceof Timestamp ? v.toDate() : new Date());

const toDomain = (id: string, d: DocumentData): AvisoEnviado => ({
  id,
  empresaId: String(d.empresaId ?? ''),
  empresaNombre: String(d.empresaNombre ?? ''),
  sistema: String(d.sistema ?? ''),
  tipo: (d.tipo === 'licencia' ? 'licencia' : 'sistema') as TipoAvisoEnviado,
  versionInstalada: d.versionInstalada ?? null,
  versionOficial: d.versionOficial ?? null,
  fechaVencimiento: d.fechaVencimiento ?? null,
  canal: (d.canal === 'whatsapp' ? 'whatsapp' : 'correo') as CanalAvisoEnviado,
  destino: d.destino ?? null,
  enviadoPorUid: String(d.enviadoPorUid ?? ''),
  enviadoPorNombre: String(d.enviadoPorNombre ?? ''),
  createdAt: fecha(d.createdAt),
});

export class FirestoreAvisoRepository implements IAvisoRepository {
  constructor(private readonly db: Firestore) {}

  private get col() {
    return this.db.collection('avisos_versiones');
  }

  async registrar(avisos: AvisoEnviado[]): Promise<void> {
    if (!avisos.length) return;
    const lote = this.db.batch();
    for (const a of avisos) {
      lote.set(this.col.doc(a.id), {
        empresaId: a.empresaId,
        empresaNombre: a.empresaNombre,
        sistema: a.sistema,
        tipo: a.tipo,
        versionInstalada: a.versionInstalada,
        versionOficial: a.versionOficial,
        fechaVencimiento: a.fechaVencimiento,
        canal: a.canal,
        destino: a.destino,
        enviadoPorUid: a.enviadoPorUid,
        enviadoPorNombre: a.enviadoPorNombre,
        createdAt: Timestamp.fromDate(a.createdAt),
      });
    }
    await lote.commit();
  }

  /**
   * El filtro por empresa es por coincidencia parcial, que Firestore no sabe hacer, así que
   * el rango de fechas sí va en la consulta (que es lo que acota el volumen) y el nombre se
   * cruza en memoria.
   */
  async list(filtro: FiltroAvisos = {}): Promise<AvisoEnviado[]> {
    let q = this.col.orderBy('createdAt', 'desc').limit(1000);
    if (filtro.desde) q = q.where('createdAt', '>=', Timestamp.fromDate(filtro.desde));
    if (filtro.hasta) q = q.where('createdAt', '<=', Timestamp.fromDate(filtro.hasta));
    const snap = await q.get();
    return snap.docs.map((d) => toDomain(d.id, d.data())).filter((a) => avisoCoincide(a, filtro));
  }
}
