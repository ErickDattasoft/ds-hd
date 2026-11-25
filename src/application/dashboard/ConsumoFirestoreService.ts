import type { IConsumoFirestoreRepository } from '../../core/ports/repositories/IConsumoFirestoreRepository.js';
import type { IClock } from '../../core/ports/services/IClock.js';
import {
  LIMITE_LECTURAS_DIA,
  diaDeCuota,
  horaMexicoDe,
  reinicioCuota,
} from '../../core/entities/value-objects/cuotaFirestore.js';
import { ZONA_MEXICO } from '../../core/entities/value-objects/horaMexico.js';

/** Qué tan cerca está la cuota: verde, amarillo (≥ 60 %) o rojo (≥ 80 %). */
export type NivelConsumo = 'ok' | 'atento' | 'peligro';

/** Resumen del consumo de hoy, listo para pintar en el Dashboard. */
export interface ResumenConsumo {
  lecturas: number;
  limite: number;
  /** 0–100 (puede pasar de 100 si ya se acabó). */
  porcentaje: number;
  nivel: NivelConsumo;
  /** Lecturas de la hora anterior completa (o de la actual si apenas empieza el día). */
  ritmoPorHora: number;
  /** A ese ritmo, cuántas horas quedan antes de acabarse (null si no hay ritmo). */
  horasRestantes: number | null;
  /** ¿A ese ritmo se acaba antes de que se reinicie? */
  seAcabaAntesDelReinicio: boolean;
  /** «2:00 a.m.»: cuándo vuelve a empezar de cero (hora de México). */
  reinicia: string;
  /** Ancho de la barra (0–100). */
  anchoBarra: number;
  /** Lecturas por hora de México, para la gráfica (solo horas con consumo); `alto` en % de la hora pico. */
  horas: { hora: string; valor: number; alto: number }[];
}

/** Umbrales del aviso: a partir de aquí se avisa en la barra de arriba a todo el equipo. */
export const PORCENTAJE_AVISO = 80;

/**
 * «📊 Consumo de Firebase»: cuántas de las 50 mil lecturas diarias gratuitas se llevan gastadas,
 * para ver venir el corte (sin cuota nadie puede entrar al CRM). Lo cuenta el propio Worker, así
 * que es aproximado: no incluye lo que se lee desde la consola de Firebase.
 */
export class ConsumoFirestoreService {
  constructor(
    private readonly repo: IConsumoFirestoreRepository,
    private readonly clock: IClock,
  ) {}

  async hoy(): Promise<ResumenConsumo> {
    const ahora = this.clock.now();
    const consumo = await this.repo.delDia(diaDeCuota(ahora));
    const lecturas = consumo?.lecturas ?? 0;
    const porHora = consumo?.porHora ?? {};
    const porcentaje = Math.round((lecturas / LIMITE_LECTURAS_DIA) * 1000) / 10;

    const horaActual = horaMexicoDe(ahora);
    const horaAnterior = horaMexicoDe(new Date(ahora.getTime() - 3_600_000));
    const ritmoPorHora = Math.max(porHora[horaAnterior] ?? 0, porHora[horaActual] ?? 0);
    const quedan = Math.max(0, LIMITE_LECTURAS_DIA - lecturas);
    const horasRestantes = ritmoPorHora > 0 ? Math.round((quedan / ritmoPorHora) * 10) / 10 : null;
    const reinicio = reinicioCuota(ahora);
    const horasAlReinicio = (reinicio.getTime() - ahora.getTime()) / 3_600_000;

    const pico = Math.max(1, ...Object.values(porHora));
    return {
      lecturas,
      limite: LIMITE_LECTURAS_DIA,
      porcentaje,
      nivel: porcentaje >= PORCENTAJE_AVISO ? 'peligro' : porcentaje >= 60 ? 'atento' : 'ok',
      ritmoPorHora,
      horasRestantes,
      seAcabaAntesDelReinicio: lecturas >= LIMITE_LECTURAS_DIA || (horasRestantes !== null && horasRestantes < horasAlReinicio),
      reinicia: reinicio.toLocaleTimeString('es-MX', { timeZone: ZONA_MEXICO, hour: 'numeric', minute: '2-digit' }),
      anchoBarra: Math.min(100, porcentaje),
      horas: Object.entries(porHora)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([hora, valor]) => ({ hora, valor, alto: Math.round((valor / pico) * 1000) / 10 })),
    };
  }
}
