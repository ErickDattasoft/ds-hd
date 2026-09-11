import { ValidationError } from '../errors/DomainError.js';

/**
 * Logo de la empresa (documento `configuracion/logo`), usado en el encabezado de correos,
 * vistas de impresión y el portal de cliente. Vive como data URL en el propio doc de
 * configuración — igual que los adjuntos de tickets, sin depender de Firebase Storage.
 */
export interface ConfiguracionLogo {
  contentType: string;
  /** Tamaño del archivo original en bytes (antes de base64). */
  tamano: number;
  /** `data:<contentType>;base64,<...>`. */
  data: string;
}

/** Tipos MIME aceptados para el logo. SVG queda fuera a propósito (puede llevar scripts). */
export const TIPOS_LOGO_PERMITIDOS: readonly string[] = ['image/png', 'image/jpeg', 'image/webp'];

/** Tope de tamaño del logo: una sola imagen de marca, más chica que un adjunto de ticket. */
export const MAX_LOGO_BYTES = 300 * 1024;

/** Valida tipo y tamaño del logo antes de guardarlo. Lanza `ValidationError` si algo falla. */
export function validarLogo(contentType: string, tamano: number): void {
  if (!TIPOS_LOGO_PERMITIDOS.includes(contentType)) {
    throw new ValidationError('Tipo de imagen no permitido (usa PNG, JPG o WebP)', {
      archivo: 'Tipo no permitido',
    });
  }
  if (!Number.isFinite(tamano) || tamano <= 0) {
    throw new ValidationError('La imagen está vacía', { archivo: 'Vacío' });
  }
  if (tamano > MAX_LOGO_BYTES) {
    const kb = Math.round(MAX_LOGO_BYTES / 1024);
    throw new ValidationError(`La imagen supera el máximo de ${kb} KB`, { archivo: 'Muy grande' });
  }
}
