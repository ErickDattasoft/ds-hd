/** Correo transaccional a enviar, agnóstico del proveedor. */
export interface CorreoSaliente {
  para: { email: string; nombre?: string }[];
  asunto: string;
  html: string;
  /** Texto plano opcional (si se omite, el proveedor puede derivarlo del HTML). */
  texto?: string;
  cc?: { email: string; nombre?: string }[];
  cco?: { email: string; nombre?: string }[];
  /** Etiquetas para rastrear el correo en el proveedor (webhooks de entrega/rebote). */
  tags?: string[];
}

/**
 * Puerto de envío de correo transaccional (hoy: Brevo). En desarrollo/tests se usa
 * un fake que solo registra los correos en memoria.
 */
export interface IEmailSender {
  enviar(correo: CorreoSaliente): Promise<void>;
}
