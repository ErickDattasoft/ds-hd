import type { Firestore } from 'firebase-admin/firestore';
import type { INotaPersonalRepository } from '../../core/ports/repositories/INotaPersonalRepository.js';
import { notaADatos, notaDesdeDatos, type NotaPersonal } from '../../core/entities/NotaPersonal.js';
import { DomainError } from '../../core/errors/DomainError.js';

/** Intentos de la transacción: si dos guardados chocan, Firestore aborta uno y se reintenta. */
const INTENTOS = 3;

const COL = 'notas_personales';

/** Sirve para ambos drivers (Admin SDK y REST). Las fechas van como texto ISO dentro del arreglo. */
export class FirestoreNotaPersonalRepository implements INotaPersonalRepository {
  constructor(private readonly db: Firestore) {}

  private static deDoc(notas: unknown): NotaPersonal[] {
    return (Array.isArray(notas) ? (notas as Record<string, unknown>[]) : [])
      .map(notaDesdeDatos)
      .filter((n): n is NotaPersonal => n !== null);
  }

  async obtener(uid: string): Promise<NotaPersonal[]> {
    const snap = await this.db.collection(COL).doc(uid).get();
    return FirestoreNotaPersonalRepository.deDoc(snap.exists ? snap.data()?.notas : undefined);
  }

  async listarTodas(): Promise<{ uid: string; notas: NotaPersonal[] }[]> {
    const snap = await this.db.collection(COL).get();
    return snap.docs.map((d) => ({ uid: d.id, notas: FirestoreNotaPersonalRepository.deDoc(d.data().notas) }));
  }

  private static aDoc(uid: string, notas: NotaPersonal[]) {
    return { uid, notas: notas.map(notaADatos) };
  }

  async modificar<T>(uid: string, cambiar: (notas: NotaPersonal[]) => { notas: NotaPersonal[]; resultado: T }): Promise<T> {
    const ref = this.db.collection(COL).doc(uid);
    for (let intento = 1; ; intento++) {
      try {
        return await this.db.runTransaction(async (tx) => {
          const snap = await tx.get(ref);
          const actuales = FirestoreNotaPersonalRepository.deDoc(
            snap.exists ? snap.data()?.notas : undefined,
          );
          const { notas, resultado } = cambiar(actuales);
          tx.set(ref, FirestoreNotaPersonalRepository.aDoc(uid, notas));
          return resultado;
        });
      } catch (err) {
        // Los errores de negocio (nota borrada, sin espacio) no se reintentan.
        if (err instanceof DomainError || intento >= INTENTOS) throw err;
      }
    }
  }

  async guardar(uid: string, notas: NotaPersonal[]): Promise<void> {
    await this.db.collection(COL).doc(uid).set(FirestoreNotaPersonalRepository.aDoc(uid, notas));
  }
}
