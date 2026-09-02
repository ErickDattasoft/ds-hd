import type { Firestore, Query } from 'firebase-admin/firestore';
import type {
  IUsuarioRepository,
  ListarUsuariosFiltro,
} from '../../core/ports/repositories/IUsuarioRepository.js';
import type { Rol } from '../../core/entities/value-objects/Rol.js';
import type { Usuario } from '../../core/entities/Usuario.js';
import { UsuarioMapper } from './mappers/UsuarioMapper.js';

const COL = 'usuarios';

/** Implementación Firestore de {@link IUsuarioRepository} (`usuarios/{uid}`). */
export class FirestoreUsuarioRepository implements IUsuarioRepository {
  constructor(private readonly db: Firestore) {}

  async findByUid(uid: string): Promise<Usuario | null> {
    const snap = await this.db.collection(COL).doc(uid).get();
    return snap.exists ? UsuarioMapper.toDomain(snap.id, snap.data()!) : null;
  }

  async findByEmail(email: string): Promise<Usuario | null> {
    const q = await this.db
      .collection(COL)
      .where('emailLower', '==', email.trim().toLowerCase())
      .limit(1)
      .get();
    const doc = q.docs[0];
    return doc ? UsuarioMapper.toDomain(doc.id, doc.data()) : null;
  }

  async list(filtro: ListarUsuariosFiltro = {}): Promise<Usuario[]> {
    let q: Query = this.db.collection(COL);
    if (filtro.rol) q = q.where('rol', '==', filtro.rol);
    if (filtro.activo !== undefined) q = q.where('activo', '==', filtro.activo);
    if (filtro.empresaId) q = q.where('empresaId', '==', filtro.empresaId);

    const snap = await q.get();
    let usuarios = snap.docs.map((d) => UsuarioMapper.toDomain(d.id, d.data()));

    if (filtro.texto) {
      const t = filtro.texto.toLowerCase();
      usuarios = usuarios.filter(
        (u) => u.nombre.toLowerCase().includes(t) || u.email.value.includes(t),
      );
    }
    return usuarios.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }

  async listAgentesAsignables(): Promise<Usuario[]> {
    const snap = await this.db
      .collection(COL)
      .where('rol', '==', 'agente')
      .where('activo', '==', true)
      .get();
    return snap.docs
      .map((d) => UsuarioMapper.toDomain(d.id, d.data()))
      .filter((u) => u.agente.disponibleAsignacion)
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }

  async save(usuario: Usuario): Promise<void> {
    await this.db.collection(COL).doc(usuario.uid).set(UsuarioMapper.toDocument(usuario), { merge: true });
  }

  async countByRol(rol: Rol): Promise<number> {
    const agg = await this.db.collection(COL).where('rol', '==', rol).where('activo', '==', true).count().get();
    return agg.data().count;
  }

  async delete(uid: string): Promise<void> {
    await this.db.collection(COL).doc(uid).delete();
  }
}
