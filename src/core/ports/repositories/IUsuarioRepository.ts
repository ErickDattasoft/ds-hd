import type { Usuario } from '../../entities/Usuario.js';
import type { Rol } from '../../entities/value-objects/Rol.js';

export interface ListarUsuariosFiltro {
  rol?: Rol;
  activo?: boolean;
  empresaId?: string;
  /** Búsqueda simple por nombre/correo (contains, case-insensitive). */
  texto?: string;
}

/**
 * Persistencia de cuentas de usuario (`usuarios/{uid}`).
 * Semántica compartida por la implementación Firestore y los fakes de test (LSP):
 * los `findBy*` devuelven `null` si no hay coincidencia; `save` hace upsert por `uid`.
 */
export interface IUsuarioRepository {
  findByUid(uid: string): Promise<Usuario | null>;
  findByEmail(email: string): Promise<Usuario | null>;
  list(filtro?: ListarUsuariosFiltro): Promise<Usuario[]>;
  /** Agentes activos y disponibles para asignación (para dropdowns y panel de carga). */
  listAgentesAsignables(): Promise<Usuario[]>;
  save(usuario: Usuario): Promise<void>;
  /** Cuántos usuarios hay con ese rol (para no dejar el sistema sin ningún admin). */
  countByRol(rol: Rol): Promise<number>;
}
