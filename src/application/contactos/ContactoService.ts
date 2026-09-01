import type { IContactoRepository, ListarContactosFiltro } from '../../core/ports/repositories/IContactoRepository.js';
import type { IEmpresaRepository } from '../../core/ports/repositories/IEmpresaRepository.js';
import type { IClock } from '../../core/ports/services/IClock.js';
import type { IIdGenerator } from '../../core/ports/services/IIdGenerator.js';
import { Contacto } from '../../core/entities/Contacto.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../../core/errors/DomainError.js';
import type { BitacoraService } from '../shared/BitacoraService.js';
import type { SessionUser } from '../shared/SessionUser.js';

export interface DatosContacto {
  nombre: string;
  empresaId: string;
  puesto?: string;
  email?: string;
  telefono?: string;
  celular?: string;
  notas?: string;
}

/** Gestión de contactos (CRUD + archivar). */
export class ContactoService {
  constructor(
    private readonly repo: IContactoRepository,
    private readonly empresas: IEmpresaRepository,
    private readonly ids: IIdGenerator,
    private readonly clock: IClock,
    private readonly bitacora: BitacoraService,
  ) {}

  listar(filtro?: ListarContactosFiltro): Promise<Contacto[]> {
    return this.repo.list(filtro);
  }

  async obtener(id: string): Promise<Contacto> {
    const c = await this.repo.findById(id);
    if (!c) throw new NotFoundError('Contacto', id);
    return c;
  }

  private assertPuedeEscribir(actor: SessionUser): void {
    if (!actor.permisos.includes('contactos:crear') && !actor.permisos.includes('contactos:editar')) {
      throw new ForbiddenError('No puedes modificar contactos');
    }
  }

  private async assertEmpresaExiste(empresaId: string): Promise<void> {
    if (!(await this.empresas.findById(empresaId))) {
      throw new ValidationError('La empresa indicada no existe', { empresaId: 'No válida' });
    }
  }

  async crear(actor: SessionUser, datos: DatosContacto): Promise<Contacto> {
    if (!actor.permisos.includes('contactos:crear')) throw new ForbiddenError('No puedes crear contactos');
    await this.assertEmpresaExiste(datos.empresaId);
    const contacto = new Contacto({ id: this.ids.newId(), ...datos, createdAt: this.clock.now() });
    await this.repo.save(contacto);
    await this.bitacora.registrar({
      actor,
      accion: 'crear',
      modulo: 'contactos',
      entidadTipo: 'Contacto',
      entidadId: contacto.id,
      resumen: `Contacto creado: ${contacto.nombre}`,
    });
    return contacto;
  }

  async actualizar(actor: SessionUser, id: string, datos: DatosContacto): Promise<Contacto> {
    this.assertPuedeEscribir(actor);
    const contacto = await this.obtener(id);
    if (datos.empresaId !== contacto.empresaId) await this.assertEmpresaExiste(datos.empresaId);
    const ahora = this.clock.now();
    contacto.nombre = datos.nombre.trim();
    contacto.empresaId = datos.empresaId;
    contacto.puesto = datos.puesto?.trim() || null;
    contacto.email = datos.email?.trim().toLowerCase() || null;
    contacto.telefono = datos.telefono?.trim() || null;
    contacto.celular = datos.celular?.trim() || null;
    contacto.notas = datos.notas?.trim() || null;
    contacto.updatedAt = ahora;
    await this.repo.save(contacto);
    await this.bitacora.registrar({
      actor,
      accion: 'editar',
      modulo: 'contactos',
      entidadTipo: 'Contacto',
      entidadId: id,
      resumen: `Contacto editado: ${contacto.nombre}`,
    });
    return contacto;
  }

  async archivar(actor: SessionUser, id: string, archivar: boolean): Promise<void> {
    if (!actor.permisos.includes('contactos:eliminar')) throw new ForbiddenError('No puedes archivar contactos');
    const contacto = await this.obtener(id);
    const ahora = this.clock.now();
    if (archivar) contacto.archivar(ahora);
    else contacto.restaurar(ahora);
    await this.repo.save(contacto);
    await this.bitacora.registrar({
      actor,
      accion: archivar ? 'archivar' : 'restaurar',
      modulo: 'contactos',
      entidadTipo: 'Contacto',
      entidadId: id,
      resumen: `${archivar ? 'Archivado' : 'Restaurado'}: ${contacto.nombre}`,
    });
  }
}
