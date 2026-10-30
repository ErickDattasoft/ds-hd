/**
 * Hora de México. El Worker corre en UTC, así que lo que se captura como "10:00" hay que
 * interpretarlo aquí y no con la zona del proceso. México no cambia de horario desde 2022:
 * siempre UTC-6.
 */
export const ZONA_MEXICO = 'America/Mexico_City';
const DESFASE_MS = 6 * 3_600_000;

/** "2026-11-05" + "10:00" capturados en hora de México → el instante real. */
export function instanteMexico(fecha: string, hora: string): Date {
  return new Date(`${fecha}T${hora}:00-06:00`);
}

/** "2026-11-05T10:00" (de un `<input type="datetime-local">`) en hora de México → instante. */
export function instanteDeDatetimeLocal(valor: string): Date {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(valor);
  return m ? instanteMexico(m[1]!, m[2]!) : new Date(valor);
}

/** Instante → "2026-11-05T10:00" en hora de México, para prellenar un `datetime-local`. */
export function datetimeLocalMexico(d: Date): string {
  return new Date(d.getTime() - DESFASE_MS).toISOString().slice(0, 16);
}

/** Instante → un `Date` cuyos getters locales dan la hora de México (para armar calendarios). */
export function relojMexico(d: Date): Date {
  const r = new Date(d.getTime() - DESFASE_MS);
  return new Date(r.getUTCFullYear(), r.getUTCMonth(), r.getUTCDate(), r.getUTCHours(), r.getUTCMinutes(), r.getUTCSeconds());
}
