import type { ConfiguracionCorreoEntrante } from '../../core/entities/ConfiguracionCorreoEntrante.js';
import type { CorreoRecibido, IBuzonEntrante } from '../../core/ports/services/IBuzonEntrante.js';

interface MensajeZoho {
  messageId?: string;
  folderId?: string;
  fromAddress?: string;
  sender?: string;
  subject?: string;
  summary?: string;
  receivedTime?: string;
}

const NUM = /^\d+$/;

/**
 * Zoho Mail por API REST con OAuth (sin tocar el DNS del dominio).
 *
 * Alta en Zoho, una sola vez: en api-console.zoho.com se crea un cliente "Self Client" con el
 * scope `ZohoMail.messages.ALL,ZohoMail.accounts.READ`, se genera un código y se cambia por un
 * refresh token (que no expira). Aquí solo se guardan client id/secret y ese refresh token.
 */
export class ZohoBuzonEntrante implements IBuzonEntrante {
  private accessToken: { valor: string; expiraEn: number } | null = null;

  private base(cfg: ConfiguracionCorreoEntrante): string {
    return `https://mail.zoho.${cfg.region || 'com'}/api`;
  }

  /** Access token de corta vida, renovado con el refresh token y reusado mientras sirva. */
  private async token(cfg: ConfiguracionCorreoEntrante): Promise<string> {
    if (this.accessToken && this.accessToken.expiraEn > Date.now() + 30_000) return this.accessToken.valor;
    if (!cfg.clientId || !cfg.clientSecret || !cfg.refreshToken) {
      throw new Error('Faltan client id, client secret o refresh token de Zoho');
    }
    const res = await fetch(`https://accounts.zoho.${cfg.region || 'com'}/oauth/v2/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: cfg.refreshToken,
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
        grant_type: 'refresh_token',
      }),
      signal: AbortSignal.timeout(10_000),
    });
    const json = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error?: string };
    if (!res.ok || !json.access_token) throw new Error(`Zoho OAuth: ${json.error ?? `HTTP ${res.status}`}`);
    this.accessToken = { valor: json.access_token, expiraEn: Date.now() + (json.expires_in ?? 3600) * 1000 };
    return json.access_token;
  }

  private async pedir(cfg: ConfiguracionCorreoEntrante, ruta: string, init: RequestInit = {}): Promise<unknown> {
    const res = await fetch(`${this.base(cfg)}${ruta}`, {
      ...init,
      headers: {
        authorization: `Zoho-oauthtoken ${await this.token(cfg)}`,
        'content-type': 'application/json',
        ...(init.headers ?? {}),
      },
      signal: AbortSignal.timeout(15_000),
    });
    const texto = await res.text();
    if (!res.ok) throw new Error(`Zoho Mail ${ruta}: HTTP ${res.status} ${texto.slice(0, 200)}`);
    try {
      return JSON.parse(texto);
    } catch {
      return {};
    }
  }

  async verificar(cfg: ConfiguracionCorreoEntrante): Promise<{ accountId: string; correo: string }> {
    const json = (await this.pedir(cfg, '/accounts')) as {
      data?: { accountId?: string; primaryEmailAddress?: string; mailboxAddress?: string }[];
    };
    const cuenta = json.data?.[0];
    if (!cuenta?.accountId) throw new Error('Zoho no devolvió ninguna cuenta de correo');
    return { accountId: String(cuenta.accountId), correo: cuenta.primaryEmailAddress ?? cuenta.mailboxAddress ?? '' };
  }

  async listarNoLeidos(cfg: ConfiguracionCorreoEntrante, limite: number): Promise<CorreoRecibido[]> {
    const accountId = cfg.accountId || (await this.verificar(cfg)).accountId;
    const params = new URLSearchParams({ status: 'unread', limit: String(limite), sortBy: 'date', sortorder: 'true' });
    if (cfg.carpeta && NUM.test(cfg.carpeta)) params.set('folderId', cfg.carpeta);
    const json = (await this.pedir(cfg, `/accounts/${encodeURIComponent(accountId)}/messages/view?${params}`)) as {
      data?: MensajeZoho[];
    };
    const correos: CorreoRecibido[] = [];
    for (const m of json.data ?? []) {
      if (!m.messageId || !m.folderId) continue;
      correos.push({
        id: String(m.messageId),
        carpetaId: String(m.folderId),
        de: extraerCorreo(m.fromAddress ?? m.sender ?? ''),
        asunto: m.subject ?? '',
        cuerpo: await this.contenido(cfg, accountId, String(m.folderId), String(m.messageId), m.summary ?? ''),
        recibidoEn: m.receivedTime && NUM.test(m.receivedTime) ? new Date(Number(m.receivedTime)) : new Date(),
      });
    }
    return correos;
  }

  /** Cuerpo del mensaje; si falla, se queda con el resumen que ya venía en el listado. */
  private async contenido(
    cfg: ConfiguracionCorreoEntrante,
    accountId: string,
    carpetaId: string,
    messageId: string,
    respaldo: string,
  ): Promise<string> {
    try {
      const json = (await this.pedir(
        cfg,
        `/accounts/${encodeURIComponent(accountId)}/folders/${encodeURIComponent(carpetaId)}/messages/${encodeURIComponent(messageId)}/content`,
      )) as { data?: { content?: string } };
      return aTextoPlano(json.data?.content ?? respaldo);
    } catch {
      return aTextoPlano(respaldo);
    }
  }

  async marcarLeido(cfg: ConfiguracionCorreoEntrante, correo: CorreoRecibido): Promise<void> {
    const accountId = cfg.accountId || (await this.verificar(cfg)).accountId;
    await this.pedir(cfg, `/accounts/${encodeURIComponent(accountId)}/updatemessage`, {
      method: 'PUT',
      body: JSON.stringify({ mode: 'markAsRead', messageId: [correo.id], folderId: correo.carpetaId }),
    });
  }
}

/** `"Ana <ana@x.mx>"` → `ana@x.mx`. */
export function extraerCorreo(valor: string): string {
  const m = /<([^>]+)>/.exec(valor);
  return (m ? m[1]! : valor).trim().toLowerCase();
}

/** HTML del correo a texto legible (los cuerpos de Zoho vienen en HTML). */
export function aTextoPlano(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
