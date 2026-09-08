import type { CorreoSaliente, IEmailSender } from '../../core/ports/services/IEmailSender.js';
import type { ILogger } from '../../core/ports/services/ILogger.js';

/**
 * Sender de desarrollo: no envía nada, solo registra el correo (asunto + destinatarios
 * + enlaces) en el log. Se usa cuando no hay `BREVO_API_KEY`.
 */
export class LoggingEmailSender implements IEmailSender {
  constructor(private readonly logger: ILogger) {}

  async enviar(correo: CorreoSaliente): Promise<void> {
    this.logger.info('[correo simulado]', {
      para: correo.para.map((p) => p.email),
      ...(correo.cc?.length ? { cc: correo.cc.map((p) => p.email) } : {}),
      ...(correo.responderA ? { responderA: correo.responderA.email } : {}),
      asunto: correo.asunto,
      tags: correo.tags,
      html: correo.html,
    });
  }
}
