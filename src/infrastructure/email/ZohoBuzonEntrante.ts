import type { ConfiguracionCorreoEntrante } from '../../core/entities/ConfiguracionCorreoEntrante.js';
import type { CorreoRecibido, IBuzonEntrante } from '../../core/ports/services/IBuzonEntrante.js';
import { numeroTicketDeAsunto, textoDeHtmlCorreo } from '../../core/entities/ConfiguracionCorreoEntrante.js';

interface MensajeZoho {
  messageId?: string;
  folderId?: string;
  fromAddress?: string;
  sender?: string;
  subject?: string;
  summary?: string;
  receivedTime?: string;
  hasAttachment?: string;
  hasInline?: string;
}

interface AdjuntoZoho {
  attachmentId?: string | number;
  attachmentName?: string;
  attachmentSize?: string | number;
}

/** Una imagen pegada en el cuerpo de menos de esto es un logo o una firma. */
const MIN_INCRUSTADA_BYTES = 30 * 1024;
/** No se baja algo que de todos modos no se va a guardar (mismo tope que el servicio). */
const MAX_DESCARGA_BYTES = 5 * 1024 * 1024;

const NUM = /^\d+$/;

/**
 * Zoho Mail por API REST con OAuth (sin tocar el DNS del dominio). Solo lee: el buzón es de una
 * persona y nada se marca como leído ni se mueve.
 *
 * Alta en Zoho, una sola vez: en api-console.zoho.com se crea un cliente "Self Client" con el
 * scope `ZohoMail.messages.READ,ZohoMail.accounts.READ`, se genera un código y se cambia por un
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

  async canjearCodigo(cfg: ConfiguracionCorreoEntrante, codigo: string): Promise<string> {
    if (!cfg.clientId || !cfg.clientSecret) throw new Error('Primero pon el Client ID y el Client Secret');
    const res = await fetch(`https://accounts.zoho.${cfg.region || 'com'}/oauth/v2/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: codigo,
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
        grant_type: 'authorization_code',
      }),
      signal: AbortSignal.timeout(10_000),
    });
    const json = (await res.json().catch(() => ({}))) as { refresh_token?: string; error?: string };
    if (!json.refresh_token) {
      throw new Error(
        json.error === 'invalid_code'
          ? 'Zoho rechazó el código: dura 10 minutos y sirve una sola vez; genera otro'
          : `Zoho no devolvió el refresh token (${json.error ?? `HTTP ${res.status}`})`,
      );
    }
    this.accessToken = null;
    return json.refresh_token;
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

  async listarRecientes(
    cfg: ConfiguracionCorreoEntrante,
    opts: { desde: Date; soloConAdjuntos: boolean; limite: number },
  ): Promise<CorreoRecibido[]> {
    const accountId = cfg.accountId || (await this.verificar(cfg)).accountId;
    // Lo más nuevo primero (sortorder=false); se corta en lo ya revisado y se devuelve en orden.
    const params = new URLSearchParams({ limit: String(Math.min(opts.limite * 2, 100)), sortBy: 'date', sortorder: 'false' });
    if (cfg.carpeta && NUM.test(cfg.carpeta)) params.set('folderId', cfg.carpeta);
    const json = (await this.pedir(cfg, `/accounts/${encodeURIComponent(accountId)}/messages/view?${params}`)) as {
      data?: MensajeZoho[];
    };
    const candidatos = (json.data ?? [])
      .filter((m) => m.messageId && m.folderId && m.receivedTime && NUM.test(m.receivedTime))
      .filter((m) => Number(m.receivedTime) > opts.desde.getTime())
      .filter((m) => numeroTicketDeAsunto(m.subject ?? '') !== null)
      // Zoho manda `hasAttachment: "0"|"1"` pero `hasInline: "true"|"false"`.
      .filter((m) => !opts.soloConAdjuntos || conMarca(m.hasAttachment) || conMarca(m.hasInline))
      .sort((a, b) => Number(a.receivedTime) - Number(b.receivedTime))
      .slice(0, opts.limite);

    const correos: CorreoRecibido[] = [];
    for (const m of candidatos) {
      const carpetaId = String(m.folderId);
      const messageId = String(m.messageId);
      const { adjuntos, omitidos } = await this.adjuntos(cfg, accountId, carpetaId, messageId);
      const remitente = m.fromAddress ?? m.sender ?? '';
      correos.push({
        id: messageId,
        carpetaId,
        de: extraerCorreo(remitente),
        ...(m.sender && !m.sender.includes('@') ? { nombreDe: m.sender } : {}),
        asunto: m.subject ?? '',
        cuerpo: await this.contenido(cfg, accountId, carpetaId, messageId, m.summary ?? ''),
        recibidoEn: new Date(Number(m.receivedTime)),
        ...(adjuntos.length ? { adjuntos } : {}),
        ...(omitidos.length ? { omitidos } : {}),
      });
    }
    return correos;
  }

  /**
   * Las imágenes del correo (adjuntas o pegadas en el cuerpo), ya descargadas. Las incrustadas
   * chicas son logos o firmas y se ignoran; lo que no es imagen o pesa de más se reporta.
   */
  private async adjuntos(
    cfg: ConfiguracionCorreoEntrante,
    accountId: string,
    carpetaId: string,
    messageId: string,
  ): Promise<{ adjuntos: NonNullable<CorreoRecibido['adjuntos']>; omitidos: NonNullable<CorreoRecibido['omitidos']> }> {
    const adjuntos: NonNullable<CorreoRecibido['adjuntos']> = [];
    const omitidos: NonNullable<CorreoRecibido['omitidos']> = [];
    const ruta = `/accounts/${encodeURIComponent(accountId)}/folders/${encodeURIComponent(carpetaId)}/messages/${encodeURIComponent(messageId)}`;
    let info: { data?: { attachments?: AdjuntoZoho[]; inline?: AdjuntoZoho[] } };
    try {
      info = (await this.pedir(cfg, `${ruta}/attachmentinfo?includeInline=true`)) as typeof info;
    } catch {
      return { adjuntos, omitidos };
    }
    const lista = [
      ...(info.data?.attachments ?? []).map((a) => ({ ...a, incrustada: false })),
      ...(info.data?.inline ?? []).map((a) => ({ ...a, incrustada: true })),
    ];
    for (const a of lista) {
      const nombre = String(a.attachmentName ?? 'adjunto');
      const tamano = Number(a.attachmentSize ?? 0);
      const tipo = tipoImagen(nombre);
      if (!tipo) {
        if (!a.incrustada) omitidos.push({ nombre, motivo: 'solo se guardan imágenes' });
        continue;
      }
      if (a.incrustada && tamano > 0 && tamano <= MIN_INCRUSTADA_BYTES) continue;
      if (tamano > MAX_DESCARGA_BYTES) {
        omitidos.push({ nombre, motivo: `pesa ${(tamano / 1024 / 1024).toFixed(1)} MB (máximo 5.0 MB)` });
        continue;
      }
      try {
        const res = await fetch(`${this.base(cfg)}${ruta}/attachments/${encodeURIComponent(String(a.attachmentId))}`, {
          headers: { authorization: `Zoho-oauthtoken ${await this.token(cfg)}` },
          signal: AbortSignal.timeout(20_000),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        adjuntos.push({ nombre, contentType: tipo, base64: Buffer.from(await res.arrayBuffer()).toString('base64') });
      } catch {
        omitidos.push({ nombre, motivo: 'no se pudo descargar de Zoho' });
      }
    }
    return { adjuntos, omitidos };
  }

  /** Cuerpo del mensaje sin el hilo citado; si falla, se queda con el resumen del listado. */
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
      return textoDeHtmlCorreo(json.data?.content ?? respaldo);
    } catch {
      return aTextoPlano(respaldo);
    }
  }
}

/** Las banderas de Zoho llegan como "1"/"0" o "true"/"false" según el campo. */
function conMarca(v: string | undefined): boolean {
  return v === '1' || v === 'true';
}

/** Imagen por la extensión del archivo (Zoho no manda el tipo); `null` si no es imagen. */
function tipoImagen(nombre: string): string | null {
  const ext = /\.([a-z0-9]+)$/i.exec(nombre)?.[1]?.toLowerCase() ?? '';
  return { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp' }[ext] ?? null;
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
