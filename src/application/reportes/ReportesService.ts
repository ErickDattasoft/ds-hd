import type { ITicketQueries } from '../../core/ports/repositories/ITicketQueries.js';
import type { IClock } from '../../core/ports/services/IClock.js';
import type { Ticket } from '../../core/entities/Ticket.js';
import { ForbiddenError } from '../../core/errors/DomainError.js';
import type { SessionUser } from '../shared/SessionUser.js';

/** Una fila del reporte (un agente, un sistema o una empresa). */
export interface FilaReporte {
  clave: string;
  tickets: number;
  resueltos: number;
  /** Promedio en minutos entre la creación y la primera respuesta del equipo. */
  primeraRespuestaMin: number | null;
  /** Promedio en horas entre la creación y la resolución/cierre. */
  solucionHoras: number | null;
  horasTrabajadas: number;
  /** Promedio de la encuesta (1-5) y cuántas respuestas hubo. */
  satisfaccion: number | null;
  encuestas: number;
}

/** Reporte completo del periodo, con sus tres cortes. */
export interface Reporte {
  desde: Date;
  hasta: Date;
  total: FilaReporte;
  porAgente: FilaReporte[];
  porSistema: FilaReporte[];
  porEmpresa: FilaReporte[];
}

const promedio = (xs: number[]): number | null =>
  xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null;

/** Calcula las métricas de un grupo de tickets. */
function fila(clave: string, tickets: Ticket[], ahora: Date): FilaReporte {
  const primera: number[] = [];
  const solucion: number[] = [];
  const calif: number[] = [];
  let ms = 0;
  let resueltos = 0;
  for (const t of tickets) {
    if (t.primeraRespuestaEn) primera.push((t.primeraRespuestaEn.getTime() - t.createdAt.getTime()) / 60_000);
    const fin = t.resueltoEn ?? t.cerradoEn;
    if (fin) {
      resueltos++;
      solucion.push((fin.getTime() - t.createdAt.getTime()) / 3_600_000);
    }
    ms += t.tiempoTrabajadoEfectivoMs(ahora);
    if (t.satisfaccion) calif.push(t.satisfaccion.calificacion);
  }
  return {
    clave,
    tickets: tickets.length,
    resueltos,
    primeraRespuestaMin: promedio(primera),
    solucionHoras: promedio(solucion),
    horasTrabajadas: Math.round((ms / 3_600_000) * 10) / 10,
    satisfaccion: promedio(calif),
    encuestas: calif.length,
  };
}

/** Agrupa los tickets por una clave y calcula una fila por grupo. */
function agrupar(tickets: Ticket[], clave: (t: Ticket) => string, ahora: Date): FilaReporte[] {
  const grupos = new Map<string, Ticket[]>();
  for (const t of tickets) {
    const k = clave(t);
    grupos.set(k, [...(grupos.get(k) ?? []), t]);
  }
  return [...grupos.entries()].map(([k, ts]) => fila(k, ts, ahora)).sort((a, b) => b.tickets - a.tickets);
}

/** Reportes de desempeño del soporte en un rango de fechas (por fecha de creación del ticket). */
export class ReportesService {
  constructor(
    private readonly tickets: ITicketQueries,
    private readonly clock: IClock,
  ) {}

  async generar(actor: SessionUser, desde: Date, hasta: Date): Promise<Reporte> {
    if (!actor.permisos.includes('tickets:leer_todos')) throw new ForbiddenError('No puedes ver reportes');
    const ahora = this.clock.now();
    const todos = await this.tickets.listar({ archivado: false });
    const enRango = todos.filter((t) => t.createdAt >= desde && t.createdAt <= hasta);
    return {
      desde,
      hasta,
      total: fila('Total', enRango, ahora),
      porAgente: agrupar(enRango, (t) => t.agenteAsignadoNombre || 'Sin asignar', ahora),
      porSistema: agrupar(enRango, (t) => t.sistema || 'Sin sistema', ahora),
      porEmpresa: agrupar(enRango, (t) => t.empresaNombre || 'Sin empresa', ahora),
    };
  }

  /** CSV (Excel en español: separador `;`) de una sección del reporte. */
  static csv(titulo: string, filas: FilaReporte[]): string {
    const n = (v: number | null) => (v === null ? '' : String(v).replace('.', ','));
    const lineas = [
      [titulo, 'Tickets', 'Resueltos', 'Primera respuesta (min)', 'Solución (h)', 'Horas trabajadas', 'Satisfacción', 'Encuestas'].join(';'),
      ...filas.map((f) =>
        [`"${f.clave.replace(/"/g, '""')}"`, f.tickets, f.resueltos, n(f.primeraRespuestaMin), n(f.solucionHoras), n(f.horasTrabajadas), n(f.satisfaccion), f.encuestas].join(';'),
      ),
    ];
    return '﻿' + lineas.join('\r\n');
  }
}
