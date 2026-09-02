import type { IVersionRepository } from '../../core/ports/repositories/IVersionRepository.js';
import type { IClock } from '../../core/ports/services/IClock.js';
import type { IIdGenerator } from '../../core/ports/services/IIdGenerator.js';
import { VersionSistema } from '../../core/entities/VersionSistema.js';
import { ForbiddenError, NotFoundError } from '../../core/errors/DomainError.js';
import type { BitacoraService } from '../shared/BitacoraService.js';
import type { SessionUser } from '../shared/SessionUser.js';

/** Datos editables de una versión de sistema (alta o edición). */
export interface DatosVersion {
  sistema: string;
  versionActual: string;
  fechaLiberacion?: string;
  notasVersion?: string;
  linkDescarga?: string;
}

/** Catálogo de versiones vigentes de sistemas. */
export class VersionService {
  constructor(
    private readonly repo: IVersionRepository,
    private readonly ids: IIdGenerator,
    private readonly clock: IClock,
    private readonly bitacora: BitacoraService,
  ) {}

  listar(): Promise<VersionSistema[]> {
    return this.repo.list();
  }

  async obtener(id: string): Promise<VersionSistema> {
    const v = await this.repo.findById(id);
    if (!v) throw new NotFoundError('Versión', id);
    return v;
  }

  private assertPuede(actor: SessionUser): void {
    if (!actor.permisos.includes('versiones:editar')) throw new ForbiddenError('No puedes editar versiones');
  }

  async guardar(actor: SessionUser, datos: DatosVersion, id?: string): Promise<VersionSistema> {
    this.assertPuede(actor);
    const ahora = this.clock.now();
    const version = new VersionSistema({
      id: id ?? this.ids.newId(),
      ...datos,
      updatedAt: ahora,
      actualizadoPorUid: actor.uid,
    });
    await this.repo.save(version);
    await this.bitacora.registrar({
      actor,
      accion: id ? 'editar' : 'crear',
      modulo: 'versiones',
      entidadTipo: 'VersionSistema',
      entidadId: version.id,
      resumen: `${version.sistema} → ${version.versionActual}`,
    });
    return version;
  }

  async eliminar(actor: SessionUser, id: string): Promise<void> {
    this.assertPuede(actor);
    const version = await this.obtener(id);
    await this.repo.eliminar(id);
    await this.bitacora.registrar({
      actor,
      accion: 'eliminar',
      modulo: 'versiones',
      entidadTipo: 'VersionSistema',
      entidadId: id,
      resumen: `Eliminada: ${version.sistema}`,
    });
  }
}
