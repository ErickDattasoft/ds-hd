import { normalizarTelefonoMx } from '../../core/entities/value-objects/Telefono.js';
import type { WhatsAppClientesConfig } from '../../core/entities/ConfiguracionIntegraciones.js';
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

  async enviarWhatsAppClientes(cfg: WhatsAppClientesConfig, telefono: string, mensaje: string): Promise<ResultadoPrueba> {
    const numero = normalizarTelefonoMx(telefono);
    if (!numero) return { ok: false, detalle: 'Teléfono inválido' };
    try {
      if (cfg.proveedor === 'meta') return await this.meta(cfg, numero, mensaje);
      if (cfg.proveedor === 'twilio') return await this.twilio(cfg, numero, mensaje);
      return { ok: false, detalle: 'Proveedor sin envío automático' };
    } catch (err) {
      return { ok: false, detalle: err instanceof Error ? err.message : 'Error de red' };
    }
  }

  /**
   * Meta Cloud API. Un mensaje que inicia la empresa DEBE usar una plantilla aprobada: se manda
   * la plantilla con el mensaje completo como variable {{1}} (Meta no permite saltos de línea
   * dentro de una variable, así que se unen con " · ").
   */
  private async meta(cfg: WhatsAppClientesConfig, numero: string, mensaje: string): Promise<ResultadoPrueba> {
    if (!cfg.metaToken || !cfg.metaPhoneNumberId || !cfg.metaPlantilla) {
      return { ok: false, detalle: 'Faltan token, id del número o plantilla de Meta' };
    }
    const res = await fetch(`https://graph.facebook.com/v21.0/${encodeURIComponent(cfg.metaPhoneNumberId)}/messages`, {
      method: 'POST',
      headers: { authorization: `Bearer ${cfg.metaToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: numero,
        type: 'template',
        template: {
          name: cfg.metaPlantilla,
          language: { code: cfg.metaIdioma || 'es_MX' },
          components: [{ type: 'body', parameters: [{ type: 'text', text: aUnaLinea(mensaje) }] }],
        },
      }),
      signal: AbortSignal.timeout(10_000),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: { message?: string }; messages?: { id: string }[] };
    return res.ok
      ? { ok: true, detalle: `Enviado (id ${json.messages?.[0]?.id ?? '—'})` }
      : { ok: false, detalle: json.error?.message ?? `HTTP ${res.status}` };
  }

  /** Twilio: con `ContentSid` usa la plantilla aprobada; sin él, texto libre (solo sirve dentro de la ventana de 24 h). */
  private async twilio(cfg: WhatsAppClientesConfig, numero: string, mensaje: string): Promise<ResultadoPrueba> {
    if (!cfg.twilioAccountSid || !cfg.twilioAuthToken || !cfg.twilioFrom) {
      return { ok: false, detalle: 'Faltan Account SID, Auth Token o número remitente de Twilio' };
    }
    const from = cfg.twilioFrom.startsWith('whatsapp:') ? cfg.twilioFrom : `whatsapp:${cfg.twilioFrom}`;
    const form = new URLSearchParams({ From: from, To: `whatsapp:+${numero}` });
    if (cfg.twilioContentSid) {
      form.set('ContentSid', cfg.twilioContentSid);
      form.set('ContentVariables', JSON.stringify({ 1: aUnaLinea(mensaje) }));
    } else {
      form.set('Body', mensaje);
    }
    const auth = Buffer.from(`${cfg.twilioAccountSid}:${cfg.twilioAuthToken}`).toString('base64');
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(cfg.twilioAccountSid)}/Messages.json`, {
      method: 'POST',
      headers: { authorization: `Basic ${auth}`, 'content-type': 'application/x-www-form-urlencoded' },
      body: form,
      signal: AbortSignal.timeout(10_000),
    });
    const json = (await res.json().catch(() => ({}))) as { sid?: string; message?: string };
    return res.ok ? { ok: true, detalle: `Enviado (sid ${json.sid ?? '—'})` } : { ok: false, detalle: json.message ?? `HTTP ${res.status}` };
  }
}


/** Las variables de plantilla no admiten saltos de línea ni muchos espacios seguidos. */
function aUnaLinea(texto: string): string {
  return texto
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .join(' · ')
    .replace(/\s{4,}/g, '   ')
    .slice(0, 1000);
}
