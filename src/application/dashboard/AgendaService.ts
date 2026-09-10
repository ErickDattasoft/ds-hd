import type { ITicketQueries } from '../../core/ports/repositories/ITicketQueries.js';
import type { IEventoRepository } from '../../core/ports/repositories/IEventoRepository.js';
import type { ITareaRepository } from '../../core/ports/repositories/ISeguimientoRepository.js';
import type { IClock } from '../../core/ports/services/IClock.js';
import type { SessionUser } from '../shared/SessionUser.js';

/** Un elemento agendado en un día del calendario. */
export interface ItemAgenda {
  tipo: 'ticket' | 'evento' | 'tarea';
  id: string;
  titulo: string;
  /** `HH:MM` local, o `null` si es todo el día (tareas). */
  hora: string | null;
  href: string;
  /** Orden dentro del día (por hora; las tareas van al final). */
  orden: number;
}

/** Un día de la cuadrícula del calendario. */
export interface DiaCalendario {
  iso: string;
  dia: number;
  delMes: boolean;
  esHoy: boolean;
  items: ItemAgenda[];
}

/** El calendario de un mes: 6 semanas × 7 días. */
export interface CalendarioMes {
  anio: number;
  mes: number;
  etiqueta: string;
  semanas: DiaCalendario[][];
  prev: { anio: number; mes: number };
  next: { anio: number; mes: number };
  totales: { tickets: number; eventos: number; tareas: number };
}

const iso = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const hhmm = (d: Date): string =>
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

/**
 * Calendario mensual con tickets programados (agenda), eventos y tareas con fecha límite —
 * acotado al alcance del actor (sus tickets si no puede ver todos; sus tareas siempre).
 */
export class AgendaService {
  constructor(
    private readonly ticketQueries: ITicketQueries,
    private readonly eventos: IEventoRepository,
    private readonly tareas: ITareaRepository,
    private readonly clock: IClock,
  ) {}

  async mes(actor: SessionUser, anio: number, mes: number): Promise<CalendarioMes> {
    const ahora = this.clock.now();
    const inicioMes = new Date(anio, mes, 1);
    const finMes = new Date(anio, mes + 1, 0, 23, 59, 59);

    // La cuadrícula empieza el domingo de la semana del día 1 y cubre 6 semanas.
    const inicioGrid = new Date(inicioMes);
    inicioGrid.setDate(inicioGrid.getDate() - inicioGrid.getDay());
    const finGrid = new Date(inicioGrid);
    finGrid.setDate(finGrid.getDate() + 42);

    const alcance = actor.permisos.includes('tickets:leer_todos') ? {} : { agenteAsignadoUid: actor.uid };
    const [ticketsProg, todosEventos, misTareas] = await Promise.all([
      actor.permisos.includes('tickets:leer')
        ? this.ticketQueries.listar({ ...alcance, soloProgramados: true })
        : Promise.resolve([]),
      actor.permisos.includes('eventos:leer') ? this.eventos.list() : Promise.resolve([]),
      actor.permisos.includes('seguimiento:leer')
        ? this.tareas.list({ asignadoAUid: actor.uid, completada: false })
        : Promise.resolve([]),
    ]);

    const porDia = new Map<string, ItemAgenda[]>();
    const push = (fecha: Date, item: ItemAgenda): void => {
      if (fecha < inicioGrid || fecha >= finGrid) return;
      const k = iso(fecha);
      const lista = porDia.get(k) ?? [];
      lista.push(item);
      porDia.set(k, lista);
    };
    const totales = { tickets: 0, eventos: 0, tareas: 0 };

    for (const t of ticketsProg) {
      const cuando = t.fechaHoraProgramada;
      if (!cuando) continue;
      totales.tickets++;
      push(cuando, {
        tipo: 'ticket',
        id: t.id,
        titulo: `#${t.numero} ${t.asunto}`,
        hora: hhmm(cuando),
        href: `/app/tickets/${t.id}`,
        orden: cuando.getHours() * 60 + cuando.getMinutes(),
      });
    }
    for (const e of todosEventos) {
      if (e.fechaHora < inicioMes || e.fechaHora > finMes) continue;
      totales.eventos++;
      push(e.fechaHora, {
        tipo: 'evento',
        id: e.id,
        titulo: e.titulo,
        hora: hhmm(e.fechaHora),
        href: `/app/eventos/${e.id}`,
        orden: e.fechaHora.getHours() * 60 + e.fechaHora.getMinutes(),
      });
    }
    for (const tarea of misTareas) {
      if (!tarea.vence) continue;
      const d = new Date(`${tarea.vence}T12:00:00`);
      totales.tareas++;
      push(d, {
        tipo: 'tarea',
        id: tarea.id,
        titulo: tarea.titulo,
        hora: null,
        href: '/app/tareas',
        orden: 9999,
      });
    }

    const semanas: DiaCalendario[][] = [];
    const hoyIso = iso(ahora);
    for (let s = 0; s < 6; s++) {
      const semana: DiaCalendario[] = [];
      for (let d = 0; d < 7; d++) {
        const fecha = new Date(inicioGrid);
        fecha.setDate(fecha.getDate() + s * 7 + d);
        const k = iso(fecha);
        semana.push({
          iso: k,
          dia: fecha.getDate(),
          delMes: fecha.getMonth() === mes,
          esHoy: k === hoyIso,
          items: (porDia.get(k) ?? []).sort((a, b) => a.orden - b.orden),
        });
      }
      semanas.push(semana);
    }

    const etiqueta = inicioMes.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
    return {
      anio,
      mes,
      etiqueta: etiqueta.charAt(0).toUpperCase() + etiqueta.slice(1),
      semanas,
      prev: mes === 0 ? { anio: anio - 1, mes: 11 } : { anio, mes: mes - 1 },
      next: mes === 11 ? { anio: anio + 1, mes: 0 } : { anio, mes: mes + 1 },
      totales,
    };
  }
}
