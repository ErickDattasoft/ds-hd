import type { IConfiguracionRepository } from '../../core/ports/repositories/IConfiguracionRepository.js';
import {
  CalculadoraCompac,
  type ConfiguracionCalculadora,
  type EquipoInput,
  type ResultadoCalculadora,
} from '../../core/entities/CalculadoraCompac.js';

/** Caso de uso: calcular el licenciamiento Compac con la configuración vigente. */
export class CalculadoraCompacService {
  constructor(private readonly config: IConfiguracionRepository) {}

  async config_(): Promise<ConfiguracionCalculadora> {
    return this.config.obtenerCalculadora();
  }

  async calcular(equipos: EquipoInput[]): Promise<ResultadoCalculadora & { config: ConfiguracionCalculadora }> {
    const config = await this.config.obtenerCalculadora();
    return { ...CalculadoraCompac.calcular(equipos, config), config };
  }
}
