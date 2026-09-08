import { ValidationError } from '../errors/DomainError.js';

/**
 * Adjunto de un ticket. El contenido vive como data URL (`data:<tipo>;base64,…`) en su propio
 * documento `tickets_adjuntos/{id}` — igual que en el CRM viejo, para no inflar el doc del
 * ticket ni depender de Firebase Storage.
 */
export interface AdjuntoTicket {
  id: string;
  ticketId: string;
  nombre: string;
  contentType: string;
  /** Tamaño del archivo original en bytes (antes de base64). */
  tamano: number;
  /** `data:<contentType>;base64,<...>`. */
  data: string;
  subidoPorUid: string | null;
  subidoPorNombre: string | null;
  createdAt: Date;
}

/** Metadatos de un adjunto sin el contenido — para listar en el detalle sin traer los bytes. */
export type AdjuntoTicketMeta = Omit<AdjuntoTicket, 'data'>;

/** Tipos MIME que se aceptan como adjunto. SVG queda fuera a propósito (puede llevar scripts). */
export const TIPOS_ADJUNTO_PERMITIDOS: readonly string[] = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'application/pdf',
];

/**
 * Tope de tamaño por archivo. Un doc de Firestore no puede pasar de 1 MiB y base64 infla ~33 %,
 * así que 700 KiB de archivo original deja margen para el prefijo y los metadatos.
 */
export const MAX_ADJUNTO_BYTES = 700 * 1024;

/** Máximo de adjuntos por ticket. */
export const MAX_ADJUNTOS_POR_TICKET = 20;

/** Deja el nombre de archivo en algo seguro y legible (sin rutas ni caracteres de control). */
export function sanearNombreArchivo(nombre: string): string {
  const prohibidos = '/\\<>:"|?*';
  const limpio = [...nombre]
    .filter((ch) => ch.codePointAt(0)! >= 0x20 && !prohibidos.includes(ch))
    .join('')
    .trim()
    .slice(0, 120);
  return limpio || 'adjunto';
}

/** Valida tipo y tamaño de un adjunto antes de guardarlo. Lanza `ValidationError` si algo falla. */
export function validarAdjunto(contentType: string, tamano: number): void {
  if (!TIPOS_ADJUNTO_PERMITIDOS.includes(contentType)) {
    throw new ValidationError('Tipo de archivo no permitido (solo imágenes y PDF)', {
      archivo: 'Tipo no permitido',
    });
  }
  if (!Number.isFinite(tamano) || tamano <= 0) {
    throw new ValidationError('El archivo está vacío', { archivo: 'Vacío' });
  }
  if (tamano > MAX_ADJUNTO_BYTES) {
    const kb = Math.round(MAX_ADJUNTO_BYTES / 1024);
    throw new ValidationError(`El archivo supera el máximo de ${kb} KB`, { archivo: 'Muy grande' });
  }
}
