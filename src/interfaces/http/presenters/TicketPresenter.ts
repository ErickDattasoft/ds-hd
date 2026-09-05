import type { Ticket } from '../../../core/entities/Ticket.js';
import { esEstadoFinal } from '../../../core/entities/value-objects/EstadoTicket.js';
import { ETIQUETAS_FACTURACION, esFacturacionCompletada } from '../../../core/entities/value-objects/EstadoFacturacion.js';

function duracion(ms: number): string {
  const seg = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(seg / 3600);
  const m = Math.floor((seg % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${seg}s`;
}

export interface TicketVM {
  id: string;
  numero: number;
  asunto: string;
  estado: string;
  prioridad: string;
  tipo: string;
  grupo: string | null;
  empresaNombre: string | null;
  contactoNombre: string | null;
  agenteAsignadoNombre: string | null;
  agenteAsignadoUid: string | null;
  canal: string;
  abierto: boolean;
  slaEstado: 'ok' | 'por-vencer' | 'vencido' | 'na';
  slaTexto: string;
  /** Tiempo trabajado efectivo (ajuste manual si existe, si no el calculado). */
  tiempoTrabajado: string;
  /** El cálculo automático, para mostrar entre paréntesis cuando hay ajuste manual. */
  tiempoTrabajadoAuto: string;
  tiempoEsManual: boolean;
  /** Línea de tiempo visual: un tramo por cambio de estado. */
  lineaDeTiempo: { estado: string; desdeIso: string; duracion: string; cuenta: boolean }[];
  /** Total facturable — visible cuando el ticket está resuelto/cerrado. */
  totalFacturable: { texto: string; clase: 'consultoria' | 'referencia'; visible: boolean };
  abiertoEnIso: string;
  facturacion: {
    estado: string;
    etiqueta: string;
    /** Clase de badge para colorear el total facturable — `null` = sin marcar (no aplica). */
    clase: 'ok' | 'warning' | null;
  };
  /** Programación de atención, o `null` si el ticket no tiene agenda. */
  agenda: {
    fecha: string;
    hora: string;
    recordatorioWhatsapp: boolean;
    texto: string;
    /** `true` si la fecha ya pasó y el ticket sigue abierto (badge en rojo). */
    vencida: boolean;
  } | null;
}

/** Convierte un Ticket de dominio en un view model para las plantillas (vistas "tontas"). */
export function ticketVM(t: Ticket, ahora: Date): TicketVM {
  const final = esEstadoFinal(t.estado);
  const restante = t.slaRestanteMs(ahora);
  let slaEstado: TicketVM['slaEstado'] = 'ok';
  let slaTexto = '';
  if (final) {
    slaEstado = 'na';
    slaTexto = t.resueltoEn ? 'Resuelto' : '—';
  } else if (restante < 0) {
    slaEstado = 'vencido';
    slaTexto = `Vencido hace ${duracion(-restante)}`;
  } else if (restante < 2 * 3_600_000) {
    slaEstado = 'por-vencer';
    slaTexto = `Vence en ${duracion(restante)}`;
  } else {
    slaTexto = `${duracion(restante)} restantes`;
  }

  return {
    id: t.id,
    numero: t.numero,
    asunto: t.asunto,
    estado: t.estado,
    prioridad: t.prioridad,
    tipo: t.tipo,
    grupo: t.grupo,
    empresaNombre: t.empresaNombre,
    contactoNombre: t.contactoNombre,
    agenteAsignadoNombre: t.agenteAsignadoNombre,
    agenteAsignadoUid: t.agenteAsignadoUid,
    canal: t.canal,
    abierto: !final,
    slaEstado,
    slaTexto,
    tiempoTrabajado: duracion(t.tiempoTrabajadoEfectivoMs(ahora)),
    tiempoTrabajadoAuto: duracion(t.tiempoTrabajadoCalculadoMs(ahora)),
    tiempoEsManual: t.tiempoTrabajadoManualMs !== null,
    lineaDeTiempo: t.lineaDeTiempo(ahora).map((tr) => ({
      estado: tr.estado,
      desdeIso: tr.desde.toISOString(),
      duracion: duracion(tr.ms),
      cuenta: tr.cuenta,
    })),
    totalFacturable: {
      texto: duracion(t.tiempoTrabajadoEfectivoMs(ahora)),
      clase: t.facturacion.requiere ? 'consultoria' : 'referencia',
      visible: final,
    },
    abiertoEnIso: t.abiertoEn.toISOString(),
    facturacion: {
      estado: t.facturacion.estado,
      etiqueta: ETIQUETAS_FACTURACION[t.facturacion.estado],
      clase: esFacturacionCompletada(t.facturacion.estado)
        ? 'ok'
        : t.facturacion.estado === 'no_facturado' && t.facturacion.requiere
          ? 'warning'
          : null,
    },
    agenda: t.agenda
      ? {
          fecha: t.agenda.fecha,
          hora: t.agenda.hora,
          recordatorioWhatsapp: t.agenda.recordatorioWhatsapp,
          texto: `${t.agenda.fecha} ${t.agenda.hora}`,
          vencida: t.agendaVencida(ahora),
        }
      : null,
  };
}
