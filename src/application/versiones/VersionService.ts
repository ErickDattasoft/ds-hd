import type { IVersionRepository } from '../../core/ports/repositories/IVersionRepository.js';
import type { IClock } from '../../core/ports/services/IClock.js';
import type { IIdGenerator } from '../../core/ports/services/IIdGenerator.js';
import { VersionSistema, componerVersion, separarVersion, type ServicePackVersion } from '../../core/entities/VersionSistema.js';
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
  /** La versión sin SP ("12.1.0"); si traen "12.1.0 Sp 2" escrito, el SP se separa al guardar. */
  versionActual: string;
  /** Cada SP en su renglón. Sin la propiedad, se conservan los que ya tenía. */
  servicePacks?: ServicePackVersion[];
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
    // El formulario de una sola versión no edita los SP: se conservan mientras la versión siga
    // siendo la misma (si cambia de versión, los SP de la anterior ya no aplican).
    const previa = id ? await this.repo.findById(id) : null;
    const mismaBase = previa && separarVersion(previa.versionActual).base === separarVersion(datos.versionActual).base;
    const version = new VersionSistema({
      id: id ?? this.ids.newId(),
      ...datos,
      servicePacks: mismaBase ? previa.servicePacks : [],
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
  async gridMercado(
    sistemasCatalogo: string[],
  ): Promise<Array<FilaMercado & { id: string | null; updatedAt: Date | null; servicePacks: ServicePackVersion[] }>> {
    const registradas = await this.repo.list();
    const porSistema = new Map(registradas.map((v) => [v.sistema, v]));
    const nombres = [...new Set([...sistemasCatalogo, ...registradas.map((v) => v.sistema)].map((s) => s.trim()).filter(Boolean))];
    nombres.sort((a, b) => a.localeCompare(b, 'es'));
    return nombres.map((sistema) => {
      const v = porSistema.get(sistema);
      const { base, sp } = separarVersion(v?.versionActual ?? '');
      // Registrada a mano como "19.1.2 Sp 1", sin renglones de SP: se muestra el SP 1 vacío.
      const servicePacks =
        v?.servicePacks.length || !sp ? (v?.servicePacks ?? []) : [{ numero: sp, fecha: null, linkDescarga: null, nota: null }];
      return {
        id: v?.id ?? null,
        sistema,
        versionActual: base,
        servicePacks,
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
      const escrita = separarVersion(versionActual);
      const mismaBase = existente && separarVersion(existente.versionActual).base === escrita.base;
      const servicePacks = [...(fila.servicePacks ?? (mismaBase ? existente.servicePacks : []))];
      // Escribieron "12.1.0 Sp 2" en el cuadro de la versión: ese SP también cuenta.
      if (escrita.sp > 0 && !servicePacks.some((p) => p.numero === escrita.sp)) {
        servicePacks.push({ numero: escrita.sp, fecha: null, linkDescarga: null, nota: null });
      }
      const version = new VersionSistema({
        id: existente?.id ?? this.ids.newId(),
        sistema,
        versionActual: componerVersion(escrita.base, servicePacks.map((p) => p.numero)),
        servicePacks,
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
