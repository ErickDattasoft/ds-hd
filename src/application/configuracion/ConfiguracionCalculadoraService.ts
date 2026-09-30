import type { IConfiguracionRepository } from '../../core/ports/repositories/IConfiguracionRepository.js';
import type { ILogger } from '../../core/ports/services/ILogger.js';
import {
  sanearConfigCalculadora,
  type ConfiguracionCalculadora,
} from '../../core/entities/CalculadoraCompac.js';
import { ForbiddenError, ValidationError } from '../../core/errors/DomainError.js';
import type { SessionUser } from '../shared/SessionUser.js';

/** Casos de uso: leer y actualizar catálogos y precios de la calculadora Compac/CONTPAQi. */
export class ConfiguracionCalculadoraService {
  constructor(
    private readonly repo: IConfiguracionRepository,
    private readonly logger: ILogger,
  ) {}

  obtener(): Promise<ConfiguracionCalculadora> {
    return this.repo.obtenerCalculadora();
  }

  /** Reemplaza los catálogos completos (agregar, quitar, renombrar y reordenar, como el viejo). */
  async actualizar(input: {
    actor: SessionUser;
    catalogoSistemas: string[];
    catalogoEquipos: { nombre: string; precioPrimerSistema: unknown; precioAdicional: unknown }[];
    precioSQL: unknown;
  }): Promise<void> {
    if (!input.actor.permisos.includes('configuracion:catalogos')) {
      throw new ForbiddenError('No puedes editar la configuración');
    }
    const config = sanearConfigCalculadora({
      catalogoSistemas: [...new Set(input.catalogoSistemas.map((s) => s.trim()).filter(Boolean))],
      catalogoEquipos: input.catalogoEquipos,
      precioSQL: input.precioSQL,
    });
    if (config.catalogoEquipos.length === 0) {
      throw new ValidationError('Deja al menos un tipo de equipo', { catalogoEquipos: 'Requerido' });
    }
    await this.repo.guardarCalculadora(config);
    this.logger.info('Configuración de la calculadora actualizada', { por: input.actor.uid });
  }
}
