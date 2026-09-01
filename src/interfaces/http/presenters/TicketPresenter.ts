import type { Ticket } from '../../../core/entities/Ticket.js';
import { esEstadoFinal } from '../../../core/entities/value-objects/EstadoTicket.js';

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
  tiempoTrabajado: string;
  abiertoEnIso: string;
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
    tiempoTrabajado: duracion(t.tiempoTrabajadoMs),
    abiertoEnIso: t.abiertoEn.toISOString(),
  };
}
