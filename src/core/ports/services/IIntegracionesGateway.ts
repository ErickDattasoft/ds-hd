import type { WhatsAppClientesConfig } from '../../entities/ConfiguracionIntegraciones.js';

/** Resultado de una llamada saliente a una integración externa. */
export interface ResultadoPrueba {
  ok: boolean;
  detalle: string;
}

/**
 * Llamadas HTTP salientes hacia n8n (webhook) y CallMeBot (WhatsApp). Separado de
 * `IWebhookPublisher` porque este puerto devuelve el resultado (para "probar conexión"
 * desde la UI), mientras que `IWebhookPublisher` es best-effort y no propaga nada.
 */
export interface IIntegracionesGateway {
  postWebhook(url: string, payload: Record<string, unknown>): Promise<ResultadoPrueba>;
  enviarWhatsApp(telefono: string, apiKey: string, mensaje: string): Promise<ResultadoPrueba>;
  /** WhatsApp Business a un cliente, por Meta (Cloud API) o Twilio según la config. */
  enviarWhatsAppClientes?(cfg: WhatsAppClientesConfig, telefono: string, mensaje: string): Promise<ResultadoPrueba>;
}
