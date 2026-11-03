import { ValidationError } from '../../errors/DomainError.js';

/**
 * Cumpleaños (contactos) y aniversarios de fundación (empresas). El cumpleaños se guarda solo
 * como mes-día `MM-DD` (casi nunca se sabe el año); la fundación, como fecha completa ISO para
 * poder decir cuántos años cumple. Ambos se consultan por su mes-día.
 */

const RE_MES_DIA = /^(\d{2})-(\d{2})$/;
const RE_FECHA_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;
const DIAS_POR_MES = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** `MM-DD` a partir de día y mes sueltos (los selects del formulario); vacío → null. */
export function mesDiaDe(dia: unknown, mes: unknown): string | null {
  const d = Number(dia);
  const m = Number(mes);
  if (!dia && !mes) return null;
  if (!Number.isInteger(d) || !Number.isInteger(m) || m < 1 || m > 12 || d < 1 || d > DIAS_POR_MES[m - 1]!) {
    throw new ValidationError('Fecha de cumpleaños inválida', { cumpleanos: 'Elige día y mes válidos' });
  }
  return `${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Normaliza un `MM-DD` guardado; cualquier otra cosa → null. */
export function normalizarMesDia(v: unknown): string | null {
  const r = typeof v === 'string' ? RE_MES_DIA.exec(v.trim()) : null;
  if (!r) return null;
  const m = Number(r[1]);
  const d = Number(r[2]);
  return m >= 1 && m <= 12 && d >= 1 && d <= DIAS_POR_MES[m - 1]! ? `${r[1]}-${r[2]}` : null;
}

/** Normaliza una fecha ISO `YYYY-MM-DD` (la de fundación); vacía o inválida → null. */
export function normalizarFechaISO(v: unknown): string | null {
  const r = typeof v === 'string' ? RE_FECHA_ISO.exec(v.trim()) : null;
  if (!r) return null;
  return normalizarMesDia(`${r[2]}-${r[3]}`) ? `${r[1]}-${r[2]}-${r[3]}` : null;
}

/** El `MM-DD` de una fecha ISO. */
export function mesDiaDeFecha(fechaISO: string): string {
  return fechaISO.slice(5, 10);
}

const esBisiesto = (a: number): boolean => (a % 4 === 0 && a % 100 !== 0) || a % 400 === 0;

/** Un día del rango que se revisa: su `MM-DD` y cuántos días faltan (0 = hoy). */
export interface DiaProximo {
  mesDia: string;
  dias: number;
  /** Año en que cae (para calcular los años que cumple una empresa). */
  anio: number;
}

/**
 * Los `MM-DD` de hoy y los `dias` siguientes, a partir de la fecha de hoy `YYYY-MM-DD` (ya en
 * hora de México). En años no bisiestos, quien nació un 29 de febrero se festeja el 28.
 */
export function proximosDias(hoyISO: string, dias: number): DiaProximo[] {
  const [a, m, d] = hoyISO.split('-').map(Number) as [number, number, number];
  const base = Date.UTC(a, m - 1, d);
  const out: DiaProximo[] = [];
  for (let i = 0; i <= dias; i++) {
    const f = new Date(base + i * 86_400_000);
    const anio = f.getUTCFullYear();
    const mesDia = `${String(f.getUTCMonth() + 1).padStart(2, '0')}-${String(f.getUTCDate()).padStart(2, '0')}`;
    out.push({ mesDia, dias: i, anio });
    if (mesDia === '02-28' && !esBisiesto(anio)) out.push({ mesDia: '02-29', dias: i, anio });
  }
  return out;
}
