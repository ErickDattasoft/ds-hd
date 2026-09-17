import type { IOportunidadRepository } from '../../core/ports/repositories/IOportunidadRepository.js';
import type { IEmpresaRepository } from '../../core/ports/repositories/IEmpresaRepository.js';
import type { IUsuarioRepository } from '../../core/ports/repositories/IUsuarioRepository.js';
import type { IClock } from '../../core/ports/services/IClock.js';
import type { IIdGenerator } from '../../core/ports/services/IIdGenerator.js';
import {
  ETAPAS_OPORTUNIDAD,
  ETIQUETA_ETAPA,
  Oportunidad,
  PROBABILIDAD_ETAPA,
  esEtapa,
  type EtapaOportunidad,
} from '../../core/entities/Oportunidad.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../../core/errors/DomainError.js';
import type { BitacoraService } from '../shared/BitacoraService.js';
import type { SessionUser } from '../shared/SessionUser.js';

/** Datos del formulario de oportunidad. */
export interface DatosOportunidad {
  titulo: string;
  empresaId?: string;
  monto: number;
  etapa?: string;
  cierreEstimado?: Date | null;
  responsableUid?: string;
  cotizacionId?: string;
  notas?: string;
}

/** Una etapa del embudo con sus oportunidades. */
export interface ColumnaEmbudo {
  etapa: EtapaOportunidad;
  etiqueta: string;
  oportunidades: Oportunidad[];
  total: number;
}

/** Vista completa del embudo con sus totales. */
export interface Embudo {
  columnas: ColumnaEmbudo[];
  /** Suma de montos abiertos. */
  abierto: number;
  /** Montos abiertos × probabilidad de su etapa. */
  ponderado: number;
  ganadoMes: number;
  /** % de ganadas sobre cerradas (ganadas + perdidas). */
  tasaCierre: number | null;
}

const suma = (os: Oportunidad[]) => Math.round(os.reduce((s, o) => s + o.monto, 0) * 100) / 100;

/** Embudo de ventas: oportunidades que avanzan de prospecto a ganada/perdida. */
export class OportunidadService {
  constructor(
    private readonly repo: IOportunidadRepository,
    private readonly empresas: IEmpresaRepository,
    private readonly usuarios: IUsuarioRepository,
    private readonly ids: IIdGenerator,
    private readonly clock: IClock,
    private readonly bitacora: BitacoraService,
  ) {}

  private permiso(actor: SessionUser, p: string): void {
    if (!actor.permisos.includes(p)) throw new ForbiddenError('No tienes permiso para el embudo de ventas');
  }

  async obtener(id: string): Promise<Oportunidad> {
    const o = await this.repo.findById(id);
    if (!o) throw new NotFoundError('Oportunidad', id);
    return o;
  }

  async embudo(actor: SessionUser, filtro: { responsableUid?: string } = {}): Promise<Embudo> {
    this.permiso(actor, 'cotizaciones:leer');
    const ahora = this.clock.now();
    const todas = (await this.repo.list()).filter((o) => !filtro.responsableUid || o.responsableUid === filtro.responsableUid);
    const abiertas = todas.filter((o) => o.abierta);
    const ganadas = todas.filter((o) => o.etapa === 'ganada');
    const perdidas = todas.filter((o) => o.etapa === 'perdida');
    const mesActual = (d: Date) => d.getFullYear() === ahora.getFullYear() && d.getMonth() === ahora.getMonth();
    return {
      columnas: ETAPAS_OPORTUNIDAD.map((etapa) => {
        const os = todas.filter((o) => o.etapa === etapa);
        return { etapa, etiqueta: ETIQUETA_ETAPA[etapa], oportunidades: os, total: suma(os) };
      }),
      abierto: suma(abiertas),
      ponderado: Math.round(abiertas.reduce((s, o) => s + o.monto * PROBABILIDAD_ETAPA[o.etapa], 0) * 100) / 100,
      ganadoMes: suma(ganadas.filter((o) => mesActual(o.updatedAt))),
      tasaCierre: ganadas.length + perdidas.length ? Math.round((ganadas.length / (ganadas.length + perdidas.length)) * 100) : null,
    };
  }

  private async resolver(d: DatosOportunidad) {
    const empresa = d.empresaId ? await this.empresas.findById(d.empresaId) : null;
    if (d.empresaId && !empresa) throw new ValidationError('La empresa no existe', { empresaId: 'No válida' });
    const responsable = d.responsableUid ? await this.usuarios.findByUid(d.responsableUid) : null;
    const etapa = d.etapa && esEtapa(d.etapa) ? d.etapa : 'prospecto';
    return { empresa, responsable, etapa };
  }

  async crear(actor: SessionUser, d: DatosOportunidad): Promise<Oportunidad> {
    this.permiso(actor, 'cotizaciones:crear');
    const { empresa, responsable, etapa } = await this.resolver(d);
    const ahora = this.clock.now();
    const o = new Oportunidad({
      id: this.ids.newId(),
      titulo: d.titulo,
      empresaId: empresa?.id ?? null,
      empresaNombre: empresa?.nombre ?? null,
      monto: d.monto,
      etapa,
      cierreEstimado: d.cierreEstimado ?? null,
      responsableUid: responsable?.uid ?? actor.uid,
      responsableNombre: responsable?.nombre ?? actor.nombre,
      cotizacionId: d.cotizacionId || null,
      notas: d.notas ?? null,
      motivoPerdida: null,
      createdAt: ahora,
      updatedAt: ahora,
    });
    await this.repo.save(o);
    await this.bitacora.registrar({
      actor,
      accion: 'crear',
      modulo: 'ventas',
      entidadTipo: 'Oportunidad',
      entidadId: o.id,
      resumen: `Oportunidad "${o.titulo}" (${o.empresaNombre ?? 'sin empresa'})`,
    });
    return o;
  }

  async actualizar(actor: SessionUser, id: string, d: DatosOportunidad): Promise<Oportunidad> {
    this.permiso(actor, 'cotizaciones:editar');
    const actual = await this.obtener(id);
    const { empresa, responsable, etapa } = await this.resolver(d);
    const o = new Oportunidad({
      ...actual,
      titulo: d.titulo,
      empresaId: empresa?.id ?? null,
      empresaNombre: empresa?.nombre ?? null,
      monto: d.monto,
      etapa,
      cierreEstimado: d.cierreEstimado ?? null,
      responsableUid: responsable?.uid ?? actual.responsableUid,
      responsableNombre: responsable?.nombre ?? actual.responsableNombre,
      cotizacionId: d.cotizacionId || null,
      notas: d.notas ?? null,
      updatedAt: this.clock.now(),
    });
    await this.repo.save(o);
    return o;
  }

  async mover(actor: SessionUser, id: string, etapa: string, motivoPerdida?: string): Promise<Oportunidad> {
    this.permiso(actor, 'cotizaciones:editar');
    if (!esEtapa(etapa)) throw new ValidationError('Etapa inválida');
    const o = await this.obtener(id);
    const anterior = o.etapa;
    o.moverA(etapa, this.clock.now(), motivoPerdida);
    await this.repo.save(o);
    await this.bitacora.registrar({
      actor,
      accion: 'mover',
      modulo: 'ventas',
      entidadTipo: 'Oportunidad',
      entidadId: o.id,
      resumen: `"${o.titulo}": ${ETIQUETA_ETAPA[anterior]} → ${ETIQUETA_ETAPA[etapa]}`,
    });
    return o;
  }

  async eliminar(actor: SessionUser, id: string): Promise<void> {
    this.permiso(actor, 'cotizaciones:editar');
    const o = await this.obtener(id);
    await this.repo.delete(id);
    await this.bitacora.registrar({
      actor,
      accion: 'eliminar',
      modulo: 'ventas',
      entidadTipo: 'Oportunidad',
      entidadId: id,
      resumen: `Oportunidad "${o.titulo}" eliminada`,
    });
  }
}
