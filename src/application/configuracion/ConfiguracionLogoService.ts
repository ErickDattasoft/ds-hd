import type { IConfiguracionRepository } from '../../core/ports/repositories/IConfiguracionRepository.js';
import type { ILogger } from '../../core/ports/services/ILogger.js';
import { validarLogo, type ConfiguracionLogo } from '../../core/entities/ConfiguracionLogo.js';
import { ForbiddenError } from '../../core/errors/DomainError.js';
import type { SessionUser } from '../shared/SessionUser.js';

/** Tamaño en bytes de un archivo a partir de su base64 (sin el prefijo `data:...,`). */
function tamanoDeBase64(base64: string): number {
  const limpio = base64.replace(/\s/g, '');
  const padding = limpio.endsWith('==') ? 2 : limpio.endsWith('=') ? 1 : 0;
  return Math.floor((limpio.length * 3) / 4) - padding;
}

/** Casos de uso: logo de empresa (encabezado de correos, impresión, portal). */
export class ConfiguracionLogoService {
  constructor(
    private readonly repo: IConfiguracionRepository,
    private readonly logger: ILogger,
  ) {}

  obtener(): Promise<ConfiguracionLogo | null> {
    return this.repo.obtenerLogo();
  }

  async actualizar(actor: SessionUser, input: { contentType: string; base64: string }): Promise<void> {
    if (!actor.permisos.includes('configuracion:catalogos')) {
      throw new ForbiddenError('No puedes editar la configuración');
    }
    const base64 = input.base64.replace(/\s/g, '');
    const tamano = tamanoDeBase64(base64);
    validarLogo(input.contentType, tamano);
    await this.repo.guardarLogo({
      contentType: input.contentType,
      tamano,
      data: `data:${input.contentType};base64,${base64}`,
    });
    this.logger.info('Logo de empresa actualizado', { por: actor.uid });
  }

  async eliminar(actor: SessionUser): Promise<void> {
    if (!actor.permisos.includes('configuracion:catalogos')) {
      throw new ForbiddenError('No puedes editar la configuración');
    }
    await this.repo.guardarLogo(null);
    this.logger.info('Logo de empresa eliminado', { por: actor.uid });
  }
}
