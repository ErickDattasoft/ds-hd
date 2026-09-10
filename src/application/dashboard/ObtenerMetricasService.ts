import type { ITicketQueries } from '../../core/ports/repositories/ITicketQueries.js';
import type { ICotizacionRepository } from '../../core/ports/repositories/ICotizacionRepository.js';
import type { IEventoRepository } from '../../core/ports/repositories/IEventoRepository.js';
import type { ITareaRepository } from '../../core/ports/repositories/ISeguimientoRepository.js';
import type { IBitacoraRepository } from '../../core/ports/repositories/IBitacoraRepository.js';
import type { IEmpresaRepository } from '../../core/ports/repositories/IEmpresaRepository.js';
import type { IVersionRepository } from '../../core/ports/repositories/IVersionRepository.js';
import type { ITicketPublicoRepository } from '../../core/ports/repositories/ITicketPublicoRepository.js';
import type { IClock } from '../../core/ports/services/IClock.js';
import type { SessionUser } from '../shared/SessionUser.js';
import { estadoActualizacion } from '../../core/entities/value-objects/version.js';

/** Meses hacia atrás (incluido el actual) que cubre la gráfica de tickets por mes. */
const MESES_GRAFICA = 6;

/** Resumen de licencias en riesgo para el banner y la tarjeta de "avisos pendientes". */
export interface MetricasLicencias {
  /** Empresas activas con al menos una licencia vencida o por vencer. */
  empresasEnRiesgo: number;
  /** Total de licencias vencidas (todas las empresas). */
  vencidas: number;
  /** Total de licencias por vencer (dentro del umbral de aviso). */
  porVencer: number;
  /** Empresas con algo que avisar: licencia en riesgo o versión desactualizada. */
  avisosPendientes: number;
  /** Empresas más urgentes para el banner (máx. 5). */
  banner: {
    empresaId: string;
    nombre: string;
    vencidas: number;
    porVencer: number;
    diasMin: number;
  }[];
}

/** Snapshot de métricas del dashboard, ya acotado al alcance de permisos del actor. */
export interface Metricas {
  tickets: {
    abiertos: number;
    vencidos: number;
    sinAsignar: number;
    creadosSemana: number;
    porEstado: { etiqueta: string; valor: number }[];
    porPrioridad: { etiqueta: string; valor: number }[];
    porMes: { etiqueta: string; valor: number }[];
  };
  cotizaciones: { porEstado: { etiqueta: string; valor: number }[]; totalAbiertas: number };
  misTareasPendientes: number;
  /** Tickets del buzón público a la espera de aceptar/rechazar (`0` si el actor no ve el buzón). */
  ticketsPublicosPendientes: number;
  proximosEventos: { id: string; titulo: string; fechaHora: Date }[];
  actividadReciente: { at: Date; resumen: string; actorNombre: string | null; modulo: string }[];
  /** `null` si el actor no puede leer empresas. */
  licencias: MetricasLicencias | null;
}

/** Cuenta tickets por mes de creación, últimos {@link MESES_GRAFICA} meses. */
function agruparPorMes(fechas: Date[], ahora: Date): { etiqueta: string; valor: number }[] {
  const buckets: { clave: string; etiqueta: string; valor: number }[] = [];
  for (let i = MESES_GRAFICA - 1; i >= 0; i--) {
    const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
    buckets.push({
      clave: `${d.getFullYear()}-${d.getMonth()}`,
      etiqueta: d.toLocaleDateString('es-MX', { month: 'short', year: '2-digit' }),
      valor: 0,
    });
  }
  const indice = new Map(buckets.map((b, i) => [b.clave, i]));
  for (const f of fechas) {
    const i = indice.get(`${f.getFullYear()}-${f.getMonth()}`);
    if (i !== undefined) buckets[i]!.valor += 1;
  }
  return buckets.map(({ etiqueta, valor }) => ({ etiqueta, valor }));
}

/** Caso de uso: métricas del dashboard, acotadas al alcance del actor. */
export class ObtenerMetricasService {
  constructor(
    private readonly ticketQueries: ITicketQueries,
    private readonly cotizaciones: ICotizacionRepository,
    private readonly eventos: IEventoRepository,
    private readonly tareas: ITareaRepository,
    private readonly bitacora: IBitacoraRepository,
    private readonly clock: IClock,
    private readonly empresas: IEmpresaRepository,
    private readonly versiones: IVersionRepository,
    private readonly ticketsPublicos: ITicketPublicoRepository,
  ) {}

  async ejecutar(actor: SessionUser): Promise<Metricas> {
    const ahora = this.clock.now();
    const haceUnaSemana = new Date(ahora.getTime() - 7 * 86_400_000);
    const alcance = actor.permisos.includes('tickets:leer_todos')
      ? {}
      : { agenteAsignadoUid: actor.uid };
    const puedeVerEmpresas = actor.permisos.includes('empresas:leer');

    const puedeVerBuzon = actor.permisos.includes('tickets:crear');

    const [abiertos, todos, contarPorEstado, proximos, misTareas, bita, licencias, publicos] =
      await Promise.all([
        this.ticketQueries.listar({ ...alcance, soloAbiertos: true }),
        this.ticketQueries.listar({ ...alcance, archivado: false }),
        this.cotizaciones.contarPorEstado(),
        this.eventos.proximos(ahora, new Date(ahora.getTime() + 30 * 86_400_000)),
        this.tareas.list({ asignadoAUid: actor.uid, completada: false }),
        actor.permisos.includes('bitacora:leer')
          ? this.bitacora.listar({ limite: 12 })
          : Promise.resolve([]),
        puedeVerEmpresas ? this.calcularLicencias(ahora) : Promise.resolve(null),
        puedeVerBuzon ? this.ticketsPublicos.listPendientes() : Promise.resolve([]),
      ]);

    const porEstado = new Map<string, number>();
    const porPrioridad = new Map<string, number>();
    for (const t of abiertos) {
      porEstado.set(t.estado, (porEstado.get(t.estado) ?? 0) + 1);
      porPrioridad.set(t.prioridad, (porPrioridad.get(t.prioridad) ?? 0) + 1);
    }

    return {
      tickets: {
        abiertos: abiertos.length,
        vencidos: abiertos.filter((t) => t.estaVencido(ahora)).length,
        sinAsignar: abiertos.filter((t) => !t.agenteAsignadoUid).length,
        creadosSemana: abiertos.filter((t) => t.abiertoEn >= haceUnaSemana).length,
        porEstado: [...porEstado].map(([etiqueta, valor]) => ({ etiqueta, valor })),
        porPrioridad: [...porPrioridad].map(([etiqueta, valor]) => ({ etiqueta, valor })),
        porMes: agruparPorMes(
          todos.map((t) => t.abiertoEn),
          ahora,
        ),
      },
      cotizaciones: {
        porEstado: Object.entries(contarPorEstado).map(([etiqueta, valor]) => ({ etiqueta, valor })),
        totalAbiertas:
          (contarPorEstado.borrador ?? 0) + (contarPorEstado.enviada ?? 0),
      },
      misTareasPendientes: misTareas.filter((t) => !t.completada).length,
      ticketsPublicosPendientes: publicos.length,
      proximosEventos: proximos
        .sort((a, b) => a.fechaHora.getTime() - b.fechaHora.getTime())
        .slice(0, 5)
        .map((e) => ({ id: e.id, titulo: e.titulo, fechaHora: e.fechaHora })),
      actividadReciente: bita.map((e) => ({
        at: e.at,
        resumen: e.resumen,
        actorNombre: e.actorNombre,
        modulo: e.modulo,
      })),
      licencias,
    };
  }

  /** Banner de licencias por vencer + conteo de "avisos pendientes" (empresas activas). */
  private async calcularLicencias(ahora: Date): Promise<MetricasLicencias> {
    const [empresas, versiones] = await Promise.all([
      this.empresas.list({ activa: true }),
      this.versiones.list(),
    ]);
    const oficial: Record<string, string> = {};
    for (const v of versiones) oficial[v.sistema] = v.versionActual;

    let vencidas = 0;
    let porVencer = 0;
    let empresasEnRiesgo = 0;
    let avisosPendientes = 0;
    const candidatas: MetricasLicencias['banner'] = [];

    for (const empresa of empresas) {
      const riesgo = empresa.licenciasEnRiesgo(ahora);
      const nVencidas = riesgo.filter((l) => l.estado === 'vencida').length;
      const nPorVencer = riesgo.filter((l) => l.estado === 'por_vencer').length;
      const desactualizadas = empresa.sistemasContratados.filter(
        (s) => estadoActualizacion(empresa.versionesInstaladas[s], oficial[s]) === 'desactualizada',
      ).length;

      vencidas += nVencidas;
      porVencer += nPorVencer;
      if (nVencidas || nPorVencer) {
        empresasEnRiesgo += 1;
        candidatas.push({
          empresaId: empresa.id,
          nombre: empresa.nombre,
          vencidas: nVencidas,
          porVencer: nPorVencer,
          diasMin: riesgo[0]?.dias ?? 0,
        });
      }
      if (nVencidas || nPorVencer || desactualizadas) avisosPendientes += 1;
    }

    candidatas.sort((a, b) => a.diasMin - b.diasMin);
    return {
      empresasEnRiesgo,
      vencidas,
      porVencer,
      avisosPendientes,
      banner: candidatas.slice(0, 5),
    };
  }
}
