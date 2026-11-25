/**
 * Cuota diaria gratuita de Firestore (plan Spark): 50 mil lecturas. Firebase la reinicia a la
 * medianoche del Pacífico (2:00 a.m. en Mérida; 1:00 a.m. mientras EE. UU. tiene horario de
 * verano), así que el «día» del medidor se corta a esa hora y no a la de México.
 */
export const LIMITE_LECTURAS_DIA = 50_000;
/** Zona con la que Firebase corta el día de la cuota. */
export const ZONA_CUOTA = 'America/Los_Angeles';
/** Colección donde el Worker va sumando las lecturas de cada día (`consumo_firestore/{AAAA-MM-DD}`). */
export const COLECCION_CONSUMO = 'consumo_firestore';

/** Minutos que la zona va adelante (+) o atrás (−) de UTC en ese instante. */
function desfaseMinutos(zona: string, d: Date): number {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: zona,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
      .formatToParts(d)
      .map((x) => [x.type, x.value]),
  );
  const comoUtc = Date.UTC(+p.year!, +p.month! - 1, +p.day!, +p.hour!, +p.minute!);
  return Math.round((comoUtc - Math.floor(d.getTime() / 60_000) * 60_000) / 60_000);
}

/** «AAAA-MM-DD» del día de cuota al que pertenece el instante. */
export function diaDeCuota(d: Date): string {
  return d.toLocaleDateString('en-CA', { timeZone: ZONA_CUOTA });
}

/** Instante en que empezó el día de cuota de `d` (medianoche del Pacífico). */
export function inicioDiaCuota(d: Date): Date {
  const [a, m, dd] = diaDeCuota(d).split('-').map(Number);
  const medianocheComoUtc = Date.UTC(a!, m! - 1, dd!);
  return new Date(medianocheComoUtc - desfaseMinutos(ZONA_CUOTA, new Date(medianocheComoUtc + 12 * 3_600_000)) * 60_000);
}

/** Instante en que se reinicia la cuota (el siguiente día de cuota). */
export function reinicioCuota(d: Date): Date {
  return inicioDiaCuota(new Date(inicioDiaCuota(d).getTime() + 26 * 3_600_000));
}

/** Hora de México («00»–«23») del instante: así se agrupa el consumo por hora. */
export function horaMexicoDe(d: Date): string {
  return d.toLocaleString('en-US', { timeZone: 'America/Mexico_City', hour: '2-digit', hourCycle: 'h23' }).padStart(2, '0');
}
