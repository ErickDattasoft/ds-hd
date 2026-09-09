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
  linkCartaTecnica?: string;
}

/** Una fila del grid "versiones del mercado" (edición masiva). */
export interface FilaMercado {
  sistema: string;
  versionActual: string;
  fechaLiberacion?: string;
  linkDescarga?: string;
  linkCartaTecnica?: string;
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

  /**
   * Grid "versiones del mercado": combina el catálogo de sistemas con las versiones ya
   * registradas para que se editen todas juntas. Devuelve una fila por sistema conocido.
   */
  async gridMercado(sistemasCatalogo: string[]): Promise<Array<FilaMercado & { id: string | null; updatedAt: Date | null }>> {
    const registradas = await this.repo.list();
    const porSistema = new Map(registradas.map((v) => [v.sistema, v]));
    const nombres = [...new Set([...sistemasCatalogo, ...registradas.map((v) => v.sistema)].map((s) => s.trim()).filter(Boolean))];
    nombres.sort((a, b) => a.localeCompare(b, 'es'));
    return nombres.map((sistema) => {
      const v = porSistema.get(sistema);
      return {
        id: v?.id ?? null,
        sistema,
        versionActual: v?.versionActual ?? '',
        fechaLiberacion: v?.fechaLiberacion ?? '',
        linkDescarga: v?.linkDescarga ?? '',
        linkCartaTecnica: v?.linkCartaTecnica ?? '',
        updatedAt: v?.updatedAt ?? null,
      };
    });
  }

  /** Guarda de una sola vez el grid "versiones del mercado" (upsert por nombre de sistema). */
  async guardarMercado(actor: SessionUser, filas: FilaMercado[]): Promise<number> {
    this.assertPuede(actor);
    const registradas = await this.repo.list();
    const porSistema = new Map(registradas.map((v) => [v.sistema, v]));
    const ahora = this.clock.now();
    let guardadas = 0;
    for (const fila of filas) {
      const sistema = fila.sistema.trim();
      const versionActual = (fila.versionActual ?? '').trim();
      const existente = porSistema.get(sistema);
      // Fila vacía y sin registro previo: se ignora. Con registro previo: no se borra aquí.
      if (!sistema || (!versionActual && !existente)) continue;
      if (!versionActual) continue;
      const version = new VersionSistema({
        id: existente?.id ?? this.ids.newId(),
        sistema,
        versionActual,
        fechaLiberacion: fila.fechaLiberacion ?? existente?.fechaLiberacion ?? null,
        notasVersion: existente?.notasVersion ?? null,
        linkDescarga: fila.linkDescarga ?? existente?.linkDescarga ?? null,
        linkCartaTecnica: fila.linkCartaTecnica ?? existente?.linkCartaTecnica ?? null,
        updatedAt: ahora,
        actualizadoPorUid: actor.uid,
      });
      await this.repo.save(version);
      guardadas++;
    }
    await this.bitacora.registrar({
      actor,
      accion: 'editar',
      modulo: 'versiones',
      entidadTipo: 'VersionSistema',
      entidadId: 'mercado',
      resumen: `Versiones del mercado actualizadas (${guardadas} sistemas)`,
    });
    return guardadas;
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
