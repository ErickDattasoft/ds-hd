import type {
  IUsuarioRepository,
  ListarUsuariosFiltro,
} from '../../src/core/ports/repositories/IUsuarioRepository.js';
import type { Rol } from '../../src/core/entities/value-objects/Rol.js';
import type { Usuario } from '../../src/core/entities/Usuario.js';

/** Fake en memoria de {@link IUsuarioRepository} con la misma semántica que la impl Firestore. */
export class InMemoryUsuarioRepository implements IUsuarioRepository {
  private readonly porUid = new Map<string, Usuario>();

  constructor(seed: Usuario[] = []) {
    for (const u of seed) this.porUid.set(u.uid, u);
  }

  async findByUid(uid: string): Promise<Usuario | null> {
    return this.porUid.get(uid) ?? null;
  }

  async findByEmail(email: string): Promise<Usuario | null> {
    const e = email.trim().toLowerCase();
    for (const u of this.porUid.values()) if (u.email.value === e) return u;
    return null;
  }

  async list(filtro: ListarUsuariosFiltro = {}): Promise<Usuario[]> {
    let out = [...this.porUid.values()];
    if (filtro.rol) out = out.filter((u) => u.rol === filtro.rol);
    if (filtro.activo !== undefined) out = out.filter((u) => u.activo === filtro.activo);
    if (filtro.empresaId) out = out.filter((u) => u.empresaId === filtro.empresaId);
    if (filtro.texto) {
      const t = filtro.texto.toLowerCase();
      out = out.filter((u) => u.nombre.toLowerCase().includes(t) || u.email.value.includes(t));
    }
    return out.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }

  async listAgentesAsignables(): Promise<Usuario[]> {
    return [...this.porUid.values()]
      .filter((u) => u.rol === 'agente' && u.activo && u.agente.disponibleAsignacion)
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }

  async save(usuario: Usuario): Promise<void> {
    this.porUid.set(usuario.uid, usuario);
  }

  async countByRol(rol: Rol): Promise<number> {
    return [...this.porUid.values()].filter((u) => u.rol === rol && u.activo).length;
  }
}
