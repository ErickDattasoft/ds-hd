import type { ConfiguracionTickets } from '../../entities/ConfiguracionTickets.js';
import type { ConfiguracionCalculadora } from '../../entities/CalculadoraCompac.js';

/** Documentos singleton de configuración (`configuracion/{seccion}`). */
export interface IConfiguracionRepository {
  obtenerTickets(): Promise<ConfiguracionTickets>;
  guardarTickets(config: ConfiguracionTickets): Promise<void>;
  obtenerCalculadora(): Promise<ConfiguracionCalculadora>;
  guardarCalculadora(config: ConfiguracionCalculadora): Promise<void>;
}
