import type { IConfiguracionRepository } from '../../core/ports/repositories/IConfiguracionRepository.js';
import type { ILogger } from '../../core/ports/services/ILogger.js';
import type { ConceptoCatalogo, ConfiguracionCotizaciones } from '../../core/entities/ConfiguracionCotizaciones.js';
import { ForbiddenError } from '../../core/errors/DomainError.js';
import type { SessionUser } from '../shared/SessionUser.js';

/** Casos de uso: leer y actualizar la config del módulo de cotizaciones. */
export class ConfiguracionCotizacionesService {
  constructor(
    private readonly repo: IConfiguracionRepository,
    private readonly logger: ILogger,
  ) {}

  obtener(): Promise<ConfiguracionCotizaciones> {
    return this.repo.obtenerCotizaciones();
  }

  async actualizar(input: {
    actor: SessionUser;
    condicionesPorDefecto: string;
    emisorCargoPorDefecto: string;
    emisorTelefonoPorDefecto: string;
    catalogoConceptos: ConceptoCatalogo[];
  }): Promise<void> {
    if (!input.actor.permisos.includes('configuracion:catalogos')) {
      throw new ForbiddenError('No puedes editar la configuración');
    }
    const config: ConfiguracionCotizaciones = {
      condicionesPorDefecto: input.condicionesPorDefecto.trim(),
      emisorCargoPorDefecto: input.emisorCargoPorDefecto.trim(),
      emisorTelefonoPorDefecto: input.emisorTelefonoPorDefecto.trim(),
      catalogoConceptos: input.catalogoConceptos
        .map((c) => ({
          descripcion: c.descripcion.trim(),
          precioUnitario: Number(c.precioUnitario) || 0,
          descuentoPorDefecto: Math.min(100, Math.max(0, Number(c.descuentoPorDefecto) || 0)),
        }))
        .filter((c) => c.descripcion),
    };
    await this.repo.guardarCotizaciones(config);
    this.logger.info('Configuración de cotizaciones actualizada', { por: input.actor.uid });
  }
}
