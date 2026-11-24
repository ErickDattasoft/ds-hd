import type { Firestore } from 'firebase-admin/firestore';
import type { INotaPersonalRepository } from '../../core/ports/repositories/INotaPersonalRepository.js';
import { esColorNota, type NotaPersonal } from '../../core/entities/NotaPersonal.js';

const COL = 'notas_personales';

interface NotaDoc {
  id?: string;
  texto?: string;
  color?: string;
  creadaEn?: string;
  actualizadaEn?: string;
}

const fecha = (s: unknown): Date => {
  const d = new Date(typeof s === 'string' ? s : 0);
  return Number.isNaN(d.getTime()) ? new Date(0) : d;
};

/** Sirve para ambos drivers (Admin SDK y REST). Las fechas van como texto ISO dentro del arreglo. */
export class FirestoreNotaPersonalRepository implements INotaPersonalRepository {
  constructor(private readonly db: Firestore) {}

  private static deDoc(notas: NotaDoc[] | undefined): NotaPersonal[] {
    return (notas ?? [])
      .filter((n) => n && n.id)
      .map((n) => ({
        id: String(n.id),
        texto: String(n.texto ?? ''),
        color: esColorNota(n.color) ? n.color : 'amarillo',
        creadaEn: fecha(n.creadaEn),
        actualizadaEn: fecha(n.actualizadaEn),
      }));
  }

  async obtener(uid: string): Promise<NotaPersonal[]> {
    const snap = await this.db.collection(COL).doc(uid).get();
    return FirestoreNotaPersonalRepository.deDoc(snap.exists ? (snap.data()?.notas as NotaDoc[] | undefined) : undefined);
  }

  async listarTodas(): Promise<{ uid: string; notas: NotaPersonal[] }[]> {
    const snap = await this.db.collection(COL).get();
    return snap.docs.map((d) => ({ uid: d.id, notas: FirestoreNotaPersonalRepository.deDoc(d.data().notas as NotaDoc[]) }));
  }

  async guardar(uid: string, notas: NotaPersonal[]): Promise<void> {
    await this.db.collection(COL).doc(uid).set({
      uid,
      notas: notas.map((n) => ({
        id: n.id,
        texto: n.texto,
        color: n.color,
        creadaEn: n.creadaEn.toISOString(),
        actualizadaEn: n.actualizadaEn.toISOString(),
      })),
    });
  }
}
