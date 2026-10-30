import type { CorreoRecibido } from '../../core/ports/services/IBuzonEntrante.js';
import {
  correoDeRemitente,
  nombreDeRemitente,
  textoDeHtmlCorreo,
} from '../../core/entities/ConfiguracionCorreoEntrante.js';

/** Tipos de imagen que se guardan de un correo (SVG fuera: puede llevar scripts). */
const IMAGENES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

/** Una imagen incrustada de más de esto se guarda (logos y firmas pesan menos). */
const MIN_INLINE_BYTES = 30 * 1024;
const pesoBase64 = (b64: string): number => Math.floor((b64.replace(/\s/g, '').length * 3) / 4);

/** Campo de `headers` sin importar mayúsculas (CloudMailin manda `subject`, otros `Subject`). */
function header(headers: Record<string, unknown>, nombre: string): string {
  const clave = Object.keys(headers).find((k) => k.toLowerCase() === nombre);
  const v = clave ? headers[clave] : undefined;
  return String(Array.isArray(v) ? v[0] ?? '' : v ?? '');
}

/**
 * Payload JSON (Normalised) de CloudMailin → correo del dominio. Así entra el correo sin ser
 * admin de Zoho ni tocar el DNS: un filtro de Zoho (de usuario normal) reenvía a la dirección de
 * CloudMailin, y CloudMailin lo manda aquí como POST. Formato:
 * `{ headers: { from, to, subject, date, message_id }, envelope, plain, html, reply_plain,
 *    attachments: [{ content (base64), file_name, content_type, disposition }] }`.
 */
export function correoDeCloudMailin(payload: unknown): CorreoRecibido {
  const p = (payload ?? {}) as Record<string, unknown>;
  const headers = (p.headers ?? {}) as Record<string, unknown>;
  const envelope = (p.envelope ?? {}) as Record<string, unknown>;
  // `headers.from` es el "De:" que ve la gente; `envelope.from` puede ser una dirección técnica
  // reescrita (`nombre+hash=dominio@…`) que no sirve para mostrar ni para comparar.
  const from = header(headers, 'from') || String(envelope.from ?? '');
  const html = typeof p.html === 'string' ? p.html : '';
  const plain = typeof p.plain === 'string' ? p.plain : '';
  // `reply_plain` = CloudMailin ya separó la respuesta del hilo citado; si no viene, el HTML sin
  // `<blockquote>` es más confiable que el texto plano (el recorte final lo hace `cuerpoSinCita`).
  const replyPlain = typeof p.reply_plain === 'string' ? p.reply_plain : '';
  const cuerpo = replyPlain.trim() || (html ? textoDeHtmlCorreo(html) : '') || plain.trim();
  const fecha = new Date(header(headers, 'date'));

  const todos = (Array.isArray(p.attachments) ? p.attachments : [])
    .map((a) => (a ?? {}) as Record<string, unknown>)
    // Las "inline" suelen ser logos/firmas incrustados (pesan poco); una captura pegada en el
    // cuerpo también llega "inline" pero pesa más: esa sí se guarda.
    .filter((a) => a.disposition !== 'inline' || pesoBase64(String(a.content ?? '')) > MIN_INLINE_BYTES || Number(a.size) > MIN_INLINE_BYTES)
    .map((a) => ({
      nombre: String(a.file_name ?? 'captura'),
      // "image/jpg" y "image/pjpeg" no son tipos estándar: el navegador los muestra como JPEG.
      contentType: String(a.content_type ?? '').toLowerCase().replace(/^image\/(jpg|pjpeg)$/, 'image/jpeg'),
      base64: String(a.content ?? '').replace(/\s/g, ''),
      // Con almacén de adjuntos, CloudMailin manda un enlace en vez del contenido.
      url: typeof a.url === 'string' ? a.url : '',
    }));
  const adjuntos = todos
    .filter((a) => IMAGENES.includes(a.contentType) && (a.base64 || a.url))
    .map(({ url, ...a }) => (a.base64 || !url ? a : { ...a, url }));
  const omitidos = todos
    .filter((a) => !IMAGENES.includes(a.contentType))
    .map((a) => ({ nombre: a.nombre, motivo: 'solo se guardan imágenes' }));

  return {
    id: header(headers, 'message_id') || `cm-${Date.now()}`,
    carpetaId: '',
    de: correoDeRemitente(from),
    nombreDe: nombreDeRemitente(from),
    asunto: header(headers, 'subject') || String(p.subject ?? ''),
    cuerpo,
    recibidoEn: Number.isNaN(fecha.getTime()) ? new Date() : fecha,
    ...(adjuntos.length ? { adjuntos } : {}),
    ...(omitidos.length ? { omitidos } : {}),
  };
}
