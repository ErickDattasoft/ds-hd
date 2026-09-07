import type { IBitacoraRepository, FiltroBitacora } from '../../core/ports/repositories/IBitacoraRepository.js';
import type { IClock } from '../../core/ports/services/IClock.js';
import type { IIdGenerator } from '../../core/ports/services/IIdGenerator.js';
import type { ILogger } from '../../core/ports/services/ILogger.js';
import type { EntradaBitacora } from '../../core/entities/EntradaBitacora.js';
import type { SessionUser } from './SessionUser.js';

/** Días que se conservan las entradas de bitácora; el job de retención borra lo anterior. */
export const BITACORA_RETENCION_DIAS = 60;

const DIA_MS = 86_400_000;

/** Escapa un valor para una celda CSV (comillas dobles, saltos de línea, comas). */
function celdaCsv(v: string): string {
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/**
 * Servicio transversal de auditoría: los casos de uso lo invocan para dejar registro de una
 * acción relevante. Best-effort — si el registro falla, se loguea pero no rompe la operación.
 */
export class BitacoraService {
  constructor(
    private readonly repo: IBitacoraRepository,
    private readonly ids: IIdGenerator,
    private readonly clock: IClock,
    private readonly logger: ILogger,
  ) {}

  async registrar(data: {
    actor: SessionUser | null;
    accion: string;
    modulo: string;
    entidadTipo: string;
    entidadId: string;
    resumen: string;
  }): Promise<void> {
    try {
      await this.repo.registrar({
        id: this.ids.newId(),
        at: this.clock.now(),
        actorUid: data.actor?.uid ?? null,
        actorNombre: data.actor?.nombre ?? null,
        accion: data.accion,
        modulo: data.modulo,
        entidadTipo: data.entidadTipo,
        entidadId: data.entidadId,
        resumen: data.resumen,
      });
    } catch (err) {
      this.logger.warn('No se pudo registrar en bitácora', {
        modulo: data.modulo,
        accion: data.accion,
        err: err instanceof Error ? err.message : err,
      });
    }
  }

  listar(filtro?: FiltroBitacora): Promise<EntradaBitacora[]> {
    return this.repo.listar(filtro);
  }

  /** Borra entradas anteriores a `fecha` (acción manual "Limpiar"). */
  purgar(fecha: Date, maxBorrar?: number): Promise<{ borradas: number; hayMas: boolean }> {
    return this.repo.purgar(fecha, maxBorrar);
  }

  /** Retención automática: borra lo anterior a {@link BITACORA_RETENCION_DIAS} días. */
  async aplicarRetencion(): Promise<{ borradas: number; hayMas: boolean; corte: Date }> {
    const corte = new Date(this.clock.now().getTime() - BITACORA_RETENCION_DIAS * DIA_MS);
    const r = await this.repo.purgar(corte);
    if (r.borradas) this.logger.info('Retención de bitácora', { ...r, corte });
    return { ...r, corte };
  }

  /** Exporta la bitácora filtrada como CSV (UTF-8, separador coma). */
  async exportarCsv(filtro?: FiltroBitacora): Promise<string> {
    const entradas = await this.repo.listar({ ...filtro, limite: filtro?.limite ?? 5000 });
    const cabecera = ['Fecha', 'Módulo', 'Acción', 'Entidad', 'Resumen', 'Usuario'];
    const filas = entradas.map((e) =>
      [
        e.at.toISOString(),
        e.modulo,
        e.accion,
        `${e.entidadTipo} ${e.entidadId}`.trim(),
        e.resumen,
        e.actorNombre ?? '',
      ]
        .map((c) => celdaCsv(String(c)))
        .join(','),
    );
    return [cabecera.join(','), ...filas].join('\r\n');
  }
}
