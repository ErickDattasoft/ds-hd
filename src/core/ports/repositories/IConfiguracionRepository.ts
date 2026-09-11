import type { ConfiguracionTickets } from '../../entities/ConfiguracionTickets.js';
import type { ConfiguracionCalculadora } from '../../entities/CalculadoraCompac.js';
import type { ConfiguracionAvisos } from '../../entities/ConfiguracionAvisos.js';
import type { ConfiguracionIntegraciones } from '../../entities/ConfiguracionIntegraciones.js';
import type { ConfiguracionCotizaciones } from '../../entities/ConfiguracionCotizaciones.js';
import type { AcercaDe } from '../../entities/AcercaDe.js';
import type { ConfiguracionLogo } from '../../entities/ConfiguracionLogo.js';
import type { ConfiguracionResumen } from '../../entities/ConfiguracionResumen.js';

/** Documentos singleton de configuración (`configuracion/{seccion}`). */
export interface IConfiguracionRepository {
  obtenerTickets(): Promise<ConfiguracionTickets>;
  guardarTickets(config: ConfiguracionTickets): Promise<void>;
  obtenerCalculadora(): Promise<ConfiguracionCalculadora>;
  guardarCalculadora(config: ConfiguracionCalculadora): Promise<void>;
  obtenerAvisos(): Promise<ConfiguracionAvisos>;
  guardarAvisos(config: ConfiguracionAvisos): Promise<void>;
  obtenerIntegraciones(): Promise<ConfiguracionIntegraciones>;
  guardarIntegraciones(config: ConfiguracionIntegraciones): Promise<void>;
  obtenerCotizaciones(): Promise<ConfiguracionCotizaciones>;
  guardarCotizaciones(config: ConfiguracionCotizaciones): Promise<void>;
  obtenerAcercaDe(): Promise<AcercaDe>;
  guardarAcercaDe(config: AcercaDe): Promise<void>;
  obtenerLogo(): Promise<ConfiguracionLogo | null>;
  guardarLogo(config: ConfiguracionLogo | null): Promise<void>;
  obtenerResumen(): Promise<ConfiguracionResumen>;
  guardarResumen(config: ConfiguracionResumen): Promise<void>;
}
