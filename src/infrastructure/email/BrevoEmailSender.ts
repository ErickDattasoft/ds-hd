import type { CorreoSaliente, IEmailSender } from '../../core/ports/services/IEmailSender.js';
import type { ILogger } from '../../core/ports/services/ILogger.js';

export interface BrevoOpts {
  apiKey: string;
  senderName: string;
  senderEmail: string;
}

/** Adaptador de {@link IEmailSender} sobre la API transaccional de Brevo. */
export class BrevoEmailSender implements IEmailSender {
  constructor(
    private readonly opts: BrevoOpts,
    private readonly logger: ILogger,
  ) {}

  async enviar(correo: CorreoSaliente): Promise<void> {
    const body = {
      sender: { name: this.opts.senderName, email: this.opts.senderEmail },
      to: correo.para.map((p) => ({ email: p.email, name: p.nombre })),
      cc: correo.cc?.map((p) => ({ email: p.email, name: p.nombre })),
      bcc: correo.cco?.map((p) => ({ email: p.email, name: p.nombre })),
      replyTo: correo.responderA
        ? { email: correo.responderA.email, name: correo.responderA.nombre }
        : undefined,
      subject: correo.asunto,
      htmlContent: correo.html,
      textContent: correo.texto,
      tags: correo.tags,
    };

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': this.opts.apiKey,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      const detalle = await res.text().catch(() => '');
      this.logger.error('Brevo rechazó el correo', { status: res.status, detalle, asunto: correo.asunto });
      throw new Error(`Brevo respondió ${res.status}`);
    }
    const data = (await res.json().catch(() => ({}))) as { messageId?: string };
    this.logger.info('Correo enviado por Brevo', {
      asunto: correo.asunto,
      para: correo.para.map((p) => p.email),
      messageId: data.messageId,
    });
  }
}
