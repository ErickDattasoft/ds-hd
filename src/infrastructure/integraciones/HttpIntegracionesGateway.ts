import type {
  IIntegracionesGateway,
  ResultadoPrueba,
} from '../../core/ports/services/IIntegracionesGateway.js';

/** Llama de verdad a n8n (webhook POST) y CallMeBot (WhatsApp vía GET). */
export class HttpIntegracionesGateway implements IIntegracionesGateway {
  async postWebhook(url: string, payload: Record<string, unknown>): Promise<ResultadoPrueba> {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(6000),
      });
      return { ok: res.ok, detalle: `HTTP ${res.status}` };
    } catch (err) {
      return { ok: false, detalle: err instanceof Error ? err.message : 'Error de red' };
    }
  }

  async enviarWhatsApp(telefono: string, apiKey: string, mensaje: string): Promise<ResultadoPrueba> {
    try {
      const url = `https://api.callmebot.com/whatsapp.php?${new URLSearchParams({
        phone: telefono,
        text: mensaje,
        apikey: apiKey,
      })}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      const texto = await res.text().catch(() => '');
      return { ok: res.ok, detalle: texto.slice(0, 200) || `HTTP ${res.status}` };
    } catch (err) {
      return { ok: false, detalle: err instanceof Error ? err.message : 'Error de red' };
    }
  }
}
