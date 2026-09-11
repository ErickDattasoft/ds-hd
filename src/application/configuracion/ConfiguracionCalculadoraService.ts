import type { IConfiguracionRepository } from '../../core/ports/repositories/IConfiguracionRepository.js';
import type { ILogger } from '../../core/ports/services/ILogger.js';
import type { ConfiguracionCalculadora } from '../../core/entities/CalculadoraCompac.js';
import { ForbiddenError } from '../../core/errors/DomainError.js';
import type { SessionUser } from '../shared/SessionUser.js';

const numero = (v: unknown, fallback: number): number => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

/** Casos de uso: leer y actualizar los precios de la calculadora Compac/CONTPAQi. */
export class ConfiguracionCalculadoraService {
  constructor(
    private readonly repo: IConfiguracionRepository,
    private readonly logger: ILogger,
  ) {}

  obtener(): Promise<ConfiguracionCalculadora> {
    return this.repo.obtenerCalculadora();
  }

  /** `precios` viene indexado por `clave` de sistema; solo se tocan los precios, no el catálogo. */
  async actualizar(input: {
    actor: SessionUser;
    precios: Record<string, { precioPrimero?: unknown; precioAdicional?: unknown }>;
    sqlPrecioServidor: unknown;
    sqlPrecioTerminal: unknown;
    ivaTasa: unknown;
    moneda: string;
  }): Promise<void> {
    if (!input.actor.permisos.includes('configuracion:catalogos')) {
      throw new ForbiddenError('No puedes editar la configuración');
    }
    const actual = await this.repo.obtenerCalculadora();

    const sistemas = actual.sistemas.map((s) => {
      const p = input.precios[s.clave];
      return {
        ...s,
        precioPrimero: numero(p?.precioPrimero, s.precioPrimero),
        precioAdicional: numero(p?.precioAdicional, s.precioAdicional),
      };
    });

    const ivaTasa = numero(input.ivaTasa, actual.ivaTasa);
    const config: ConfiguracionCalculadora = {
      sistemas,
      sql: {
        ...actual.sql,
        precioServidor: numero(input.sqlPrecioServidor, actual.sql.precioServidor),
        precioTerminal: numero(input.sqlPrecioTerminal, actual.sql.precioTerminal),
      },
      ivaTasa: ivaTasa <= 1 ? ivaTasa : actual.ivaTasa,
      moneda: input.moneda.trim() || actual.moneda,
    };
    await this.repo.guardarCalculadora(config);
    this.logger.info('Configuración de la calculadora actualizada', { por: input.actor.uid });
  }
}
