import type { IBitacoraRepository, FiltroBitacora } from '../../core/ports/repositories/IBitacoraRepository.js';
import type { IClock } from '../../core/ports/services/IClock.js';
import type { IIdGenerator } from '../../core/ports/services/IIdGenerator.js';
import type { ILogger } from '../../core/ports/services/ILogger.js';
import type { EntradaBitacora } from '../../core/entities/EntradaBitacora.js';
import type { SessionUser } from './SessionUser.js';

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
}
