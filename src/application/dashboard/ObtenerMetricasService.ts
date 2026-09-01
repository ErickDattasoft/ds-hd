import type { ITicketQueries } from '../../core/ports/repositories/ITicketQueries.js';
import type { ICotizacionRepository } from '../../core/ports/repositories/ICotizacionRepository.js';
import type { IEventoRepository } from '../../core/ports/repositories/IEventoRepository.js';
import type { ITareaRepository } from '../../core/ports/repositories/ISeguimientoRepository.js';
import type { IBitacoraRepository } from '../../core/ports/repositories/IBitacoraRepository.js';
import type { IClock } from '../../core/ports/services/IClock.js';
import type { SessionUser } from '../shared/SessionUser.js';

export interface Metricas {
  tickets: {
    abiertos: number;
    vencidos: number;
    sinAsignar: number;
    creadosSemana: number;
    porEstado: { etiqueta: string; valor: number }[];
    porPrioridad: { etiqueta: string; valor: number }[];
  };
  cotizaciones: { porEstado: { etiqueta: string; valor: number }[]; totalAbiertas: number };
  misTareasPendientes: number;
  proximosEventos: { id: string; titulo: string; fechaHora: Date }[];
  actividadReciente: { at: Date; resumen: string; actorNombre: string | null; modulo: string }[];
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
  ) {}

  async ejecutar(actor: SessionUser): Promise<Metricas> {
    const ahora = this.clock.now();
    const haceUnaSemana = new Date(ahora.getTime() - 7 * 86_400_000);
    const alcance = actor.permisos.includes('tickets:leer_todos')
      ? {}
      : { agenteAsignadoUid: actor.uid };

    const [abiertos, contarPorEstado, proximos, misTareas, bita] = await Promise.all([
      this.ticketQueries.listar({ ...alcance, soloAbiertos: true }),
      this.cotizaciones.contarPorEstado(),
      this.eventos.proximos(ahora, new Date(ahora.getTime() + 30 * 86_400_000)),
      this.tareas.list({ asignadoAUid: actor.uid, completada: false }),
      actor.permisos.includes('bitacora:leer') ? this.bitacora.listar({ limite: 12 }) : Promise.resolve([]),
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
      },
      cotizaciones: {
        porEstado: Object.entries(contarPorEstado).map(([etiqueta, valor]) => ({ etiqueta, valor })),
        totalAbiertas:
          (contarPorEstado.borrador ?? 0) + (contarPorEstado.enviada ?? 0),
      },
      misTareasPendientes: misTareas.filter((t) => !t.completada).length,
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
    };
  }
}
