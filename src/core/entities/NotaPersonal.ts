import { ValidationError } from '../errors/DomainError.js';

/** Colores de las notas (como Sticky Notes). */
export const COLORES_NOTA = ['amarillo', 'verde', 'rosa', 'morado', 'azul', 'gris'] as const;
export type ColorNota = (typeof COLORES_NOTA)[number];

/** Máximo de notas por persona y de letras por nota (todas viven en un solo documento). */
export const MAX_NOTAS = 300;
export const MAX_TEXTO_NOTA = 10_000;
/** Firestore no acepta documentos de más de 1 MiB: se deja margen para el resto del documento. */
export const MAX_BYTES_NOTAS = 900_000;

/** Nota personal tipo Sticky Notes: solo la ve quien la escribió. */
export interface NotaPersonal {
  id: string;
  texto: string;
  color: ColorNota;
  creadaEn: Date;
  actualizadaEn: Date;
}

/** ¿Es un color válido? */
export function esColorNota(v: unknown): v is ColorNota {
  return typeof v === 'string' && (COLORES_NOTA as readonly string[]).includes(v);
}

/** Valida el texto de una nota (puede estar vacía mientras se escribe, pero no ser enorme). */
export function validarTextoNota(texto: string): string {
  if (texto.length > MAX_TEXTO_NOTA) {
    throw new ValidationError(`La nota es muy larga (máximo ${MAX_TEXTO_NOTA} letras)`, { texto: 'Muy larga' });
  }
  return texto;
}

/** Valida que todas las notas de la persona quepan en su documento de Firestore. */
export function validarTamanoNotas(notas: readonly NotaPersonal[]): void {
  const bytes = new TextEncoder().encode(JSON.stringify(notas)).length;
  if (bytes > MAX_BYTES_NOTAS) {
    throw new ValidationError('Tus notas ya están muy llenas: borra o acorta algunas para seguir guardando', {
      texto: 'Sin espacio',
    });
  }
}
