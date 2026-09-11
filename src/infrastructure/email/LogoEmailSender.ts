import type { CorreoSaliente, IEmailSender } from '../../core/ports/services/IEmailSender.js';
import type { IConfiguracionRepository } from '../../core/ports/repositories/IConfiguracionRepository.js';

/**
 * Decora cualquier {@link IEmailSender} agregando el logo de empresa (si hay uno
 * configurado en Configuración → Apariencia) como encabezado del HTML — así ningún
 * servicio que manda correo (tickets, cotizaciones, avisos, reportes...) tiene que
 * saber de logos ni tocar su propio armado de HTML.
 */
export class LogoEmailSender implements IEmailSender {
  constructor(
    private readonly inner: IEmailSender,
    private readonly configuracion: IConfiguracionRepository,
    private readonly baseUrl: string,
  ) {}

  async enviar(correo: CorreoSaliente): Promise<void> {
    const logo = await this.configuracion.obtenerLogo();
    if (!logo) {
      await this.inner.enviar(correo);
      return;
    }
    const encabezado = `<div style="margin-bottom:16px"><img src="${this.baseUrl}/logo" alt="" style="max-height:56px" /></div>`;
    await this.inner.enviar({ ...correo, html: encabezado + correo.html });
  }
}
