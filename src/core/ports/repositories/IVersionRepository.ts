import type { VersionSistema } from '../../entities/VersionSistema.js';

/** Persistencia de versiones de sistemas (`versiones_sistemas/{id}`). */
export interface IVersionRepository {
  findById(id: string): Promise<VersionSistema | null>;
  list(): Promise<VersionSistema[]>;
  save(version: VersionSistema): Promise<void>;
  eliminar(id: string): Promise<void>;
}
