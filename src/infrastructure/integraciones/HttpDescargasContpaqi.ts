import type { IDescargasContpaqi } from '../../core/ports/services/IDescargasContpaqi.js';
import { URL_DESCARGAS_CONTPAQI } from '../../core/entities/DescargasContpaqi.js';

/** Lee https://old.contpaqi.com/descargas (página pública, ~4 MB de HTML). */
export class HttpDescargasContpaqi implements IDescargasContpaqi {
  constructor(private readonly url = URL_DESCARGAS_CONTPAQI) {}

  async leerPagina(): Promise<string> {
    let res: Response;
    try {
      res = await fetch(this.url, {
        headers: { 'user-agent': 'Mozilla/5.0 (compatible; DATTASOFT-HD)', accept: 'text/html' },
        signal: AbortSignal.timeout(20_000),
      });
    } catch (err) {
      throw new Error(`No se pudo abrir la página de descargas de CONTPAQi (${err instanceof Error ? err.message : 'error de red'})`);
    }
    if (!res.ok) throw new Error(`La página de descargas de CONTPAQi respondió HTTP ${res.status}`);
    return res.text();
  }
}
