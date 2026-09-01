import type { ConfiguracionTickets } from '../../entities/ConfiguracionTickets.js';

/** Documentos singleton de configuración (`configuracion/{seccion}`). */
export interface IConfiguracionRepository {
  obtenerTickets(): Promise<ConfiguracionTickets>;
  guardarTickets(config: ConfiguracionTickets): Promise<void>;
}
