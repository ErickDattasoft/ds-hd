import type { DocumentData, DocumentReference, Firestore } from 'firebase-admin/firestore';
import type {
  IUnionEmpresasRepository,
  ReferenciasEmpresa,
} from '../../core/ports/repositories/IUnionEmpresasRepository.js';

/** Colecciones con un campo `empresaId` simple; `conNombre` = también guardan `empresaNombre`. */
const SIMPLES: { clave: Exclude<keyof ReferenciasEmpresa, 'usuarios'>; col: string; conNombre: boolean }[] = [
  { clave: 'contactos', col: 'contactos', conNombre: false },
  { clave: 'tickets', col: 'tickets', conNombre: true },
  { clave: 'cotizaciones', col: 'cotizaciones', conNombre: true },
  { clave: 'tareas', col: 'tareas', conNombre: false },
  { clave: 'interacciones', col: 'interacciones', conNombre: false },
  { clave: 'oportunidades', col: 'oportunidades', conNombre: true },
  // El historial de avisos guarda el nombre con el que se mandó: solo cambia el id.
  { clave: 'avisos', col: 'avisos_versiones', conNombre: false },
];

interface Escritura {
  ref: DocumentReference;
  datos: DocumentData;
}

/** Implementación Firestore de {@link IUnionEmpresasRepository}. */
export class FirestoreUnionEmpresasRepository implements IUnionEmpresasRepository {
  constructor(private readonly db: Firestore) {}

  async contarReferencias(empresaId: string): Promise<ReferenciasEmpresa> {
    const contar = async (col: string, campo: string, op: '==' | 'array-contains'): Promise<number> =>
      (await this.db.collection(col).where(campo, op, empresaId).count().get()).data().count;
    const [simples, principal, adicional] = await Promise.all([
      Promise.all(SIMPLES.map((s) => contar(s.col, 'empresaId', '=='))),
      contar('usuarios', 'empresaId', '=='),
      contar('usuarios', 'empresasAdicionales', 'array-contains'),
    ]);
    const r = { usuarios: principal + adicional } as ReferenciasEmpresa;
    SIMPLES.forEach((s, i) => (r[s.clave] = simples[i]!));
    return r;
  }

  async moverReferencias(deId: string, a: { id: string; nombre: string }): Promise<ReferenciasEmpresa> {
    const escrituras: Escritura[] = [];
    const r = { usuarios: 0 } as ReferenciasEmpresa;

    const snaps = await Promise.all(SIMPLES.map((s) => this.db.collection(s.col).where('empresaId', '==', deId).get()));
    SIMPLES.forEach((s, i) => {
      const docs = snaps[i]!.docs;
      r[s.clave] = docs.length;
      for (const d of docs) {
        escrituras.push({ ref: d.ref, datos: s.conNombre ? { empresaId: a.id, empresaNombre: a.nombre } : { empresaId: a.id } });
      }
    });

    // Cuentas del portal: la empresa puede ser la principal o una de las adicionales.
    const [principal, adicional] = await Promise.all([
      this.db.collection('usuarios').where('empresaId', '==', deId).get(),
      this.db.collection('usuarios').where('empresasAdicionales', 'array-contains', deId).get(),
    ]);
    const usuarios = new Map([...principal.docs, ...adicional.docs].map((d) => [d.id, d]));
    for (const d of usuarios.values()) {
      const datos = d.data();
      const empresaId = datos.empresaId === deId ? a.id : (datos.empresaId ?? null);
      const adicionales = [
        ...new Set(((datos.empresasAdicionales ?? []) as string[]).map((x) => (x === deId ? a.id : x))),
      ].filter((x) => x && x !== empresaId);
      escrituras.push({ ref: d.ref, datos: { empresaId, empresasAdicionales: adicionales } });
    }
    r.usuarios = usuarios.size;

    await this.escribir(escrituras);
    return r;
  }

  async moverReferenciasContacto(deId: string, aId: string): Promise<number> {
    const snaps = await Promise.all(
      ['tickets', 'cotizaciones', 'tareas', 'interacciones'].map((col) =>
        this.db.collection(col).where('contactoId', '==', deId).get(),
      ),
    );
    const escrituras = snaps.flatMap((s) => s.docs.map((d) => ({ ref: d.ref, datos: { contactoId: aId } })));
    await this.escribir(escrituras);
    return escrituras.length;
  }

  private async escribir(escrituras: Escritura[]): Promise<void> {
    for (let i = 0; i < escrituras.length; i += 500) {
      const batch = this.db.batch();
      for (const e of escrituras.slice(i, i + 500)) batch.set(e.ref, e.datos, { merge: true });
      await batch.commit();
    }
  }
}
