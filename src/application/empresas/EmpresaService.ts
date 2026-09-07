import type { IEmpresaRepository, ListarEmpresasFiltro } from '../../core/ports/repositories/IEmpresaRepository.js';
import type { IClock } from '../../core/ports/services/IClock.js';
import type { IIdGenerator } from '../../core/ports/services/IIdGenerator.js';
import { Empresa } from '../../core/entities/Empresa.js';
import { ConflictError, ForbiddenError, NotFoundError } from '../../core/errors/DomainError.js';
import type { BitacoraService } from '../shared/BitacoraService.js';
import type { SessionUser } from '../shared/SessionUser.js';

/** Datos editables de una empresa (alta o edición). */
export interface DatosEmpresa {
  nombre: string;
  rfc?: string;
  razonSocial?: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  sistemasContratados?: string[];
  /** Fecha de vigencia de licencia por sistema, formato ISO `YYYY-MM-DD`. */
  vigencias?: Record<string, string>;
  /** Versión instalada por sistema (texto libre). */
  versionesInstaladas?: Record<string, string>;
  notas?: string;
}

/** Gestión de empresas (CRUD + archivar). */
export class EmpresaService {
  constructor(
    private readonly repo: IEmpresaRepository,
    private readonly ids: IIdGenerator,
    private readonly clock: IClock,
    private readonly bitacora: BitacoraService,
  ) {}

  listar(filtro?: ListarEmpresasFiltro): Promise<Empresa[]> {
    return this.repo.list(filtro);
  }

  async obtener(id: string): Promise<Empresa> {
    const e = await this.repo.findById(id);
    if (!e) throw new NotFoundError('Empresa', id);
    return e;
  }

  private assertPuedeEscribir(actor: SessionUser): void {
    if (!actor.permisos.includes('empresas:crear') && !actor.permisos.includes('empresas:editar')) {
      throw new ForbiddenError('No puedes modificar empresas');
    }
  }

  async crear(actor: SessionUser, datos: DatosEmpresa): Promise<Empresa> {
    if (!actor.permisos.includes('empresas:crear')) throw new ForbiddenError('No puedes crear empresas');
    if (await this.repo.existePorNombre(datos.nombre)) {
      throw new ConflictError(`Ya existe una empresa llamada "${datos.nombre}"`);
    }
    const empresa = new Empresa({
      id: this.ids.newId(),
      ...datos,
      creadoPorUid: actor.uid,
      createdAt: this.clock.now(),
    });
    await this.repo.save(empresa);
    await this.bitacora.registrar({
      actor,
      accion: 'crear',
      modulo: 'empresas',
      entidadTipo: 'Empresa',
      entidadId: empresa.id,
      resumen: `Empresa creada: ${empresa.nombre}`,
    });
    return empresa;
  }

  async actualizar(actor: SessionUser, id: string, datos: DatosEmpresa): Promise<Empresa> {
    this.assertPuedeEscribir(actor);
    const empresa = await this.obtener(id);
    if (datos.nombre !== empresa.nombre && (await this.repo.existePorNombre(datos.nombre, id))) {
      throw new ConflictError(`Ya existe otra empresa llamada "${datos.nombre}"`);
    }
    const ahora = this.clock.now();
    empresa.nombre = datos.nombre.trim();
    empresa.rfc = datos.rfc?.trim().toUpperCase() || null;
    empresa.razonSocial = datos.razonSocial?.trim() || null;
    empresa.direccion = datos.direccion?.trim() || null;
    empresa.telefono = datos.telefono?.trim() || null;
    empresa.email = datos.email?.trim().toLowerCase() || null;
    empresa.sistemasContratados = [...new Set((datos.sistemasContratados ?? []).map((s) => s.trim()).filter(Boolean))];
    empresa.vigencias = Empresa.sanearVigencias(datos.vigencias, empresa.sistemasContratados);
    empresa.versionesInstaladas = Empresa.sanearMapaSistemas(datos.versionesInstaladas, empresa.sistemasContratados);
    empresa.notas = datos.notas?.trim() || null;
    empresa.updatedAt = ahora;
    await this.repo.save(empresa);
    await this.bitacora.registrar({
      actor,
      accion: 'editar',
      modulo: 'empresas',
      entidadTipo: 'Empresa',
      entidadId: id,
      resumen: `Empresa editada: ${empresa.nombre}`,
    });
    return empresa;
  }

  async alternarFavorita(actor: SessionUser, id: string, favorita: boolean): Promise<void> {
    if (!actor.permisos.includes('empresas:editar')) {
      throw new ForbiddenError('No puedes marcar empresas como favoritas');
    }
    const empresa = await this.obtener(id);
    empresa.marcarFavorita(favorita, this.clock.now());
    await this.repo.save(empresa);
    await this.bitacora.registrar({
      actor,
      accion: favorita ? 'favorita' : 'quitar_favorita',
      modulo: 'empresas',
      entidadTipo: 'Empresa',
      entidadId: id,
      resumen: `${favorita ? '⭐ Marcada' : 'Quitada de'} favoritas: ${empresa.nombre}`,
    });
  }

  async archivar(actor: SessionUser, id: string, archivar: boolean): Promise<void> {
    if (!actor.permisos.includes('empresas:eliminar')) throw new ForbiddenError('No puedes archivar empresas');
    const empresa = await this.obtener(id);
    const ahora = this.clock.now();
    if (archivar) empresa.archivar(ahora);
    else empresa.restaurar(ahora);
    await this.repo.save(empresa);
    await this.bitacora.registrar({
      actor,
      accion: archivar ? 'archivar' : 'restaurar',
      modulo: 'empresas',
      entidadTipo: 'Empresa',
      entidadId: id,
      resumen: `${archivar ? 'Archivada' : 'Restaurada'}: ${empresa.nombre}`,
    });
  }
}
