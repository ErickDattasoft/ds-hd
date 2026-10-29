import {
  leerPaginaDescargas,
  sistemasDelMercado,
  ultimaVersionDe,
  type EstadoVersionesContpaqi,
  type UltimaVersionContpaqi,
} from '../../core/entities/DescargasContpaqi.js';
import { compararVersiones } from '../../core/entities/value-objects/version.js';
import type { IConfiguracionRepository } from '../../core/ports/repositories/IConfiguracionRepository.js';
import type { IVersionRepository } from '../../core/ports/repositories/IVersionRepository.js';
import type { IClock } from '../../core/ports/services/IClock.js';
import type { IDescargasContpaqi } from '../../core/ports/services/IDescargasContpaqi.js';
import type { ILogger } from '../../core/ports/services/ILogger.js';

/** Un sistema registrado cuya versión ya no es la última que publicó CONTPAQi. */
export interface NovedadVersion {
  sistema: string;
  actual: string;
  nueva: UltimaVersionContpaqi;
}

/** El cron revisa la página una vez al día (corre cada hora). */
const HORAS_ENTRE_REVISIONES = 23;

/**
 * Versiones publicadas en la página de descargas de CONTPAQi: las lee, guarda lo último por
 * sistema y dice cuáles de las registradas ya tienen versión nueva. Nunca guarda versiones
 * del mercado por su cuenta: eso lo confirma una persona en "Versiones del mercado".
 */
export class VersionesContpaqiService {
  constructor(
    private readonly configuracion: IConfiguracionRepository,
    private readonly versiones: IVersionRepository,
    private readonly descargas: IDescargasContpaqi,
    private readonly clock: IClock,
    private readonly logger: ILogger,
  ) {}

  estado(): Promise<EstadoVersionesContpaqi> {
    return this.configuracion.obtenerVersionesContpaqi();
  }

  /** Lee la página ahora mismo y guarda lo último de cada sistema (catálogo + ya registrados). */
  async consultar(): Promise<EstadoVersionesContpaqi> {
    const ahora = this.clock.now().toISOString();
    const previo = await this.configuracion.obtenerVersionesContpaqi();
    try {
      const html = await this.descargas.leerPagina();
      const publicaciones = leerPaginaDescargas(html);
      if (!publicaciones.length) {
        throw new Error('La página de descargas de CONTPAQi cambió de formato: no se encontró ninguna publicación');
      }
      const [{ sistemas }, registradas] = await Promise.all([this.configuracion.obtenerTickets(), this.versiones.list()]);
      const nombres = new Set([...sistemasDelMercado(sistemas), ...registradas.map((v) => v.sistema)].map((s) => s.trim()).filter(Boolean));
      const ultimas: Record<string, UltimaVersionContpaqi> = {};
      for (const sistema of nombres) {
        const u = ultimaVersionDe(sistema, publicaciones);
        if (u) ultimas[sistema] = u;
      }
      const estado: EstadoVersionesContpaqi = { revisado: ahora, intentado: ahora, ultimas, error: '' };
      await this.configuracion.guardarVersionesContpaqi(estado);
      return estado;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'No se pudo leer la página de descargas de CONTPAQi';
      this.logger.warn('Versiones CONTPAQi: no se pudo leer la página', { error });
      // Se conserva lo último bueno: el aviso del menú no desaparece por una falla de red.
      await this.configuracion.guardarVersionesContpaqi({ ...previo, intentado: ahora, error });
      throw new Error(error);
    }
  }

  /** Para el cron: lee la página si pasó un día desde el último intento. */
  async revisarSiToca(): Promise<{ revisado: boolean; novedades: number; error?: string }> {
    const previo = await this.configuracion.obtenerVersionesContpaqi();
    const horas = previo.intentado ? (this.clock.now().getTime() - Date.parse(previo.intentado)) / 3_600_000 : Infinity;
    if (horas < HORAS_ENTRE_REVISIONES) return { revisado: false, novedades: (await this.novedades(previo)).length };
    try {
      const estado = await this.consultar();
      return { revisado: true, novedades: (await this.novedades(estado)).length };
    } catch (err) {
      return { revisado: false, novedades: (await this.novedades(previo)).length, error: (err as Error).message };
    }
  }

  /**
   * Sistemas registrados con una versión menor a la última publicada. Los que no tienen versión
   * registrada no cuentan (si no se lleva ese sistema, el aviso del menú no se quitaría nunca).
   */
  async novedades(estado?: EstadoVersionesContpaqi): Promise<NovedadVersion[]> {
    const e = estado ?? (await this.configuracion.obtenerVersionesContpaqi());
    if (!Object.keys(e.ultimas).length) return [];
    const registradas = await this.versiones.list();
    return registradas
      .filter((v) => e.ultimas[v.sistema] && compararVersiones(v.versionActual, e.ultimas[v.sistema]!.version) < 0)
      .map((v) => ({ sistema: v.sistema, actual: v.versionActual, nueva: e.ultimas[v.sistema]! }))
      .sort((a, b) => a.sistema.localeCompare(b.sistema, 'es'));
  }
}
