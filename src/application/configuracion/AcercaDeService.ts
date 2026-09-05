import type { IConfiguracionRepository } from '../../core/ports/repositories/IConfiguracionRepository.js';
import type { ILogger } from '../../core/ports/services/ILogger.js';
import { sanearAcercaDe, type AcercaDe } from '../../core/entities/AcercaDe.js';
import { ForbiddenError } from '../../core/errors/DomainError.js';
import type { SessionUser } from '../shared/SessionUser.js';

const limpiar = (v: unknown): string => String(v ?? '').trim();

/** Casos de uso: leer y editar la parte configurable de "Acerca de". */
export class AcercaDeService {
  constructor(
    private readonly repo: IConfiguracionRepository,
    private readonly logger: ILogger,
  ) {}

  obtener(): Promise<AcercaDe> {
    return this.repo.obtenerAcercaDe();
  }

  async actualizar(input: {
    actor: SessionUser;
    version: string;
    ultimaActualizacion: string;
    notas: string;
  }): Promise<void> {
    if (!input.actor.permisos.includes('configuracion:catalogos')) {
      throw new ForbiddenError('No puedes editar "Acerca de"');
    }
    const config = sanearAcercaDe({
      version: limpiar(input.version),
      ultimaActualizacion: limpiar(input.ultimaActualizacion),
      notas: input.notas ?? '',
    });
    await this.repo.guardarAcercaDe(config);
    this.logger.info('Acerca de actualizado', { por: input.actor.uid });
  }
}
