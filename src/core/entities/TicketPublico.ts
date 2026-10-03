/**
 * Ticket entrante creado desde el formulario público (sin cuenta). Va a un buzón aparte
 * (`tickets_publicos`) que el staff revisa y acepta (crea un ticket real) o rechaza.
 */
export interface TicketPublico {
  id: string;
  folio: string;
  nombre: string;
  empresa: string | null;
  correo: string;
  telefono: string | null;
  asunto: string;
  sistema: string | null;
  tipo: string | null;
  prioridad: string;
  descripcion: string;
  /** Hasta {@link MAX_IMAGENES_PUBLICO} imágenes (data URL, ya comprimidas por el navegador). */
  imagenes?: ImagenTicketPublico[];
  /** De dónde llegó: el formulario público o un correo sin número de ticket (solicitud por correo). */
  origen?: 'formulario' | 'correo';
  estado: 'pendiente' | 'aceptado' | 'rechazado';
  ticketNumero: number | null;
  createdAt: Date;
}

/** Una imagen adjunta al formulario público; al aceptar el ticket se vuelve adjunto real. */
export interface ImagenTicketPublico {
  nombre: string;
  contentType: string;
  /** `data:image/...;base64,...` */
  data: string;
}

/** Como el CRM viejo: hasta 3 imágenes. */
export const MAX_IMAGENES_PUBLICO = 3;
/** Tope por imagen (data URL); el navegador ya las reduce a 900 px. El doc completo < 1 MiB. */
export const MAX_DATAURL_IMAGEN_PUBLICO = 280_000;

const DATA_URL_IMAGEN_RE = /^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/]+=*)$/;

/** Valida y normaliza las imágenes que llegan del formulario público (descarta las inválidas). */
export function imagenesPublicasValidas(datos: readonly string[]): ImagenTicketPublico[] {
  const out: ImagenTicketPublico[] = [];
  for (const d of datos) {
    if (out.length >= MAX_IMAGENES_PUBLICO) break;
    if (!d || d.length > MAX_DATAURL_IMAGEN_PUBLICO) continue;
    const m = DATA_URL_IMAGEN_RE.exec(d.trim());
    if (!m) continue;
    const ext = m[1]!.split('/')[1] === 'jpeg' ? 'jpg' : m[1]!.split('/')[1];
    out.push({ nombre: `imagen-${out.length + 1}.${ext}`, contentType: m[1]!, data: d.trim() });
  }
  return out;
}
