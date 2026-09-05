import { ValidationError } from '../../errors/DomainError.js';

/**
 * Programación de atención de un ticket ("📅 Programar atención" del CRM viejo): una fecha y
 * hora en las que se atenderá, y si se pide un recordatorio por WhatsApp 30 min antes (que
 * dispara n8n — ds-hd solo publica el evento con la fecha/hora objetivo).
 */
export interface AgendaTicket {
  /** `YYYY-MM-DD`. */
  fecha: string;
  /** `HH:MM` (24 h). */
  hora: string;
  recordatorioWhatsapp: boolean;
}

const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const RE_HORA = /^\d{2}:\d{2}$/;

/** Valida y normaliza los campos de agenda que llegan de un formulario. */
export function parseAgenda(input: {
  fecha: unknown;
  hora: unknown;
  recordatorioWhatsapp: unknown;
}): AgendaTicket {
  const fecha = String(input.fecha ?? '').trim();
  const hora = (String(input.hora ?? '').trim() || '09:00').slice(0, 5);
  if (!RE_FECHA.test(fecha)) {
    throw new ValidationError('Fecha programada inválida', { agendaFecha: 'Usa el formato AAAA-MM-DD' });
  }
  if (!RE_HORA.test(hora)) {
    throw new ValidationError('Hora programada inválida', { agendaHora: 'Usa el formato HH:MM' });
  }
  if (Number.isNaN(fechaHoraAgenda({ fecha, hora, recordatorioWhatsapp: false }).getTime())) {
    throw new ValidationError('Fecha/hora programada inválida', { agendaFecha: 'No es una fecha real' });
  }
  return { fecha, hora, recordatorioWhatsapp: input.recordatorioWhatsapp === true };
}

/** Reconstruye la agenda desde props/Firestore; `null` si el ticket no tiene programación. */
export function sanearAgenda(v: unknown): AgendaTicket | null {
  if (!v || typeof v !== 'object') return null;
  const d = v as Record<string, unknown>;
  const fecha = String(d.fecha ?? '').trim();
  if (!RE_FECHA.test(fecha)) return null;
  const hora = RE_HORA.test(String(d.hora ?? '')) ? String(d.hora) : '09:00';
  return { fecha, hora, recordatorioWhatsapp: d.recordatorioWhatsapp === true };
}

/** La fecha/hora programada como `Date` (hora local del proceso, igual que el CRM viejo). */
export function fechaHoraAgenda(a: AgendaTicket): Date {
  return new Date(`${a.fecha}T${a.hora}:00`);
}
