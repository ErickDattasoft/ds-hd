import nodemailer, { type Transporter } from 'nodemailer';
import type { CorreoSaliente, IEmailSender } from '../../core/ports/services/IEmailSender.js';
import type { ILogger } from '../../core/ports/services/ILogger.js';

export interface SmtpOpts {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  senderName: string;
  senderEmail: string;
}

/**
 * Adaptador de {@link IEmailSender} sobre SMTP (nodemailer). Se usa en desarrollo contra
 * MailHog y sirve también como transporte SMTP genérico en producción si se prefiere sobre
 * la API de Brevo.
 */
export class SmtpEmailSender implements IEmailSender {
  private readonly tx: Transporter;

  constructor(
    private readonly opts: SmtpOpts,
    private readonly logger: ILogger,
  ) {
    this.tx = nodemailer.createTransport({
      host: opts.host,
      port: opts.port,
      secure: opts.secure,
      ...(opts.user ? { auth: { user: opts.user, pass: opts.pass ?? '' } } : {}),
    });
  }

  async enviar(correo: CorreoSaliente): Promise<void> {
    await this.tx.sendMail({
      from: { name: this.opts.senderName, address: this.opts.senderEmail },
      to: correo.para.map((p) => (p.nombre ? `"${p.nombre}" <${p.email}>` : p.email)),
      cc: correo.cc?.map((p) => p.email),
      bcc: correo.cco?.map((p) => p.email),
      replyTo: correo.responderA?.email,
      subject: correo.asunto,
      html: correo.html,
      text: correo.texto,
      headers: correo.tags?.length ? { 'X-Tags': correo.tags.join(',') } : undefined,
    });
    this.logger.debug('Correo SMTP enviado', { asunto: correo.asunto, para: correo.para.map((p) => p.email) });
  }
}
