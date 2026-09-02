import type { ICotizacionRepository, ListarCotizacionesFiltro } from '../../core/ports/repositories/ICotizacionRepository.js';
import type { IContadorRepository } from '../../core/ports/repositories/IContadorRepository.js';
import type { IEmpresaRepository } from '../../core/ports/repositories/IEmpresaRepository.js';
import type { IClock } from '../../core/ports/services/IClock.js';
import type { IIdGenerator } from '../../core/ports/services/IIdGenerator.js';
import { Cotizacion, type ConceptoCotizacion, type EstadoCotizacion } from '../../core/entities/Cotizacion.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../../core/errors/DomainError.js';
import type { BitacoraService } from '../shared/BitacoraService.js';
import type { SessionUser } from '../shared/SessionUser.js';

/** Datos para crear una cotización (folio y montos se calculan en el servicio). */
export interface DatosCotizacion {
  empresaId: string;
  contactoId?: string;
  vigenciaDias?: number;
  notas?: string;
  conceptos: ConceptoCotizacion[];
  origenCalculadora?: boolean;
  parametrosCompac?: Record<string, unknown> | null;
}

/** Gestión de cotizaciones: folio consecutivo, conceptos, ciclo de estado. */
export class CotizacionService {
  constructor(
    private readonly repo: ICotizacionRepository,
    private readonly contadores: IContadorRepository,
    private readonly empresas: IEmpresaRepository,
    private readonly ids: IIdGenerator,
    private readonly clock: IClock,
    private readonly bitacora: BitacoraService,
  ) {}

  listar(filtro?: ListarCotizacionesFiltro): Promise<Cotizacion[]> {
    return this.repo.list(filtro);
  }

  async obtener(id: string): Promise<Cotizacion> {
    const c = await this.repo.findById(id);
    if (!c) throw new NotFoundError('Cotización', id);
    return c;
  }

  private assertPuedeEditar(actor: SessionUser): void {
    if (!actor.permisos.includes('cotizaciones:crear') && !actor.permisos.includes('cotizaciones:editar')) {
      throw new ForbiddenError('No puedes modificar cotizaciones');
    }
  }

  async crear(actor: SessionUser, datos: DatosCotizacion): Promise<Cotizacion> {
    if (!actor.permisos.includes('cotizaciones:crear')) throw new ForbiddenError('No puedes crear cotizaciones');
    const empresa = await this.empresas.findById(datos.empresaId);
    if (!empresa) throw new ValidationError('La empresa no existe', { empresaId: 'No válida' });
    if (!datos.conceptos.length) throw new ValidationError('Agrega al menos un concepto', { conceptos: 'Requerido' });

    const ahora = this.clock.now();
    const num = await this.contadores.siguiente(`cotizaciones-${ahora.getFullYear()}`);
    const folio = `COT-${ahora.getFullYear()}-${String(num).padStart(4, '0')}`;

    const cotizacion = new Cotizacion({
      id: this.ids.newId(),
      folio,
      empresaId: datos.empresaId,
      empresaNombre: empresa.nombre,
      contactoId: datos.contactoId ?? null,
      fecha: ahora,
      vigenciaDias: datos.vigenciaDias ?? 15,
      conceptos: datos.conceptos,
      notas: datos.notas ?? null,
      origenCalculadora: datos.origenCalculadora ?? false,
      parametrosCompac: datos.parametrosCompac ?? null,
      creadoPorUid: actor.uid,
      createdAt: ahora,
    });
    await this.repo.save(cotizacion);
    await this.bitacora.registrar({
      actor,
      accion: 'crear',
      modulo: 'cotizaciones',
      entidadTipo: 'Cotizacion',
      entidadId: cotizacion.id,
      resumen: `${folio} para ${empresa.nombre} — ${this.fmt(cotizacion.total, cotizacion.moneda)}`,
    });
    return cotizacion;
  }

  async actualizarConceptos(
    actor: SessionUser,
    id: string,
    conceptos: ConceptoCotizacion[],
    notas?: string,
  ): Promise<Cotizacion> {
    this.assertPuedeEditar(actor);
    const cotizacion = await this.obtener(id);
    cotizacion.reemplazarConceptos(conceptos, this.clock.now());
    if (notas !== undefined) cotizacion.notas = notas.trim() || null;
    await this.repo.save(cotizacion);
    await this.bitacora.registrar({
      actor,
      accion: 'editar',
      modulo: 'cotizaciones',
      entidadTipo: 'Cotizacion',
      entidadId: id,
      resumen: `${cotizacion.folio} actualizada`,
    });
    return cotizacion;
  }

  async cambiarEstado(actor: SessionUser, id: string, estado: EstadoCotizacion): Promise<void> {
    const requiereAprobar = estado === 'aceptada' || estado === 'rechazada';
    if (requiereAprobar && !actor.permisos.includes('cotizaciones:aprobar')) {
      throw new ForbiddenError('No puedes aprobar/rechazar cotizaciones');
    }
    this.assertPuedeEditar(actor);
    const cotizacion = await this.obtener(id);
    cotizacion.cambiarEstado(estado, this.clock.now());
    await this.repo.save(cotizacion);
    await this.bitacora.registrar({
      actor,
      accion: 'cambiar_estado',
      modulo: 'cotizaciones',
      entidadTipo: 'Cotizacion',
      entidadId: id,
      resumen: `${cotizacion.folio} → ${estado}`,
    });
  }

  contarPorEstado(): Promise<Record<string, number>> {
    return this.repo.contarPorEstado();
  }

  private fmt(n: number, moneda: string): string {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: moneda }).format(n);
  }
}
