import { ValidationError } from '../errors/DomainError.js';

/** Colores de las notas (como Sticky Notes). */
export const COLORES_NOTA = ['amarillo', 'verde', 'rosa', 'morado', 'azul', 'gris'] as const;
export type ColorNota = (typeof COLORES_NOTA)[number];

/** Máximo de notas por persona y de letras por nota (todas viven en un solo documento). */
export const MAX_NOTAS = 300;
export const MAX_TEXTO_NOTA = 10_000;
/** Firestore no acepta documentos de más de 1 MiB: se deja margen para el resto del documento. */
export const MAX_BYTES_NOTAS = 900_000;

/** Días que una nota borrada se queda en la papelera antes de irse para siempre. */
export const DIAS_PAPELERA_NOTAS = 30;

/** Máximo de imágenes por nota (cada una vive en su propio documento, `notas_imagenes/{id}`). */
export const MAX_IMAGENES_NOTA = 10;
/** Tipos de imagen que se aceptan en una nota (SVG no: puede llevar scripts). */
export const TIPOS_IMAGEN_NOTA: readonly string[] = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

/** Referencia a una imagen de la nota (el contenido va aparte). */
export interface ImagenDeNota {
  id: string;
  nombre: string;
}

/** Imagen pegada en una nota, con su contenido (`data:<tipo>;base64,…`). Solo la ve su dueño. */
export interface NotaImagen {
  id: string;
  uid: string;
  notaId: string;
  nombre: string;
  contentType: string;
  /** Bytes del archivo (antes de base64). */
  tamano: number;
  /** `data:<contentType>;base64,<...>`. */
  data: string;
  creadaEn: Date;
}

/** Ticket que salió de una nota (vía ⚡ Captura rápida). */
export interface TicketDeNota {
  id: string;
  numero: number;
}

/** Nota personal tipo Sticky Notes: solo la ve quien la escribió. */
export interface NotaPersonal {
  id: string;
  texto: string;
  color: ColorNota;
  creadaEn: Date;
  actualizadaEn: Date;
  /** 📌 Fijada: sale hasta arriba. */
  fijada: boolean;
  /** ⏰ Día del recordatorio («AAAA-MM-DD», hora de México) o null. */
  recordarEn: string | null;
  /** En la papelera desde esta fecha (null = activa). */
  eliminadaEn: Date | null;
  /** Tickets creados a partir de esta nota (🎫 #N). */
  tickets: TicketDeNota[];
  /** 🖼 Imágenes pegadas en la nota. */
  imagenes: ImagenDeNota[];
}

const fechaDe = (v: unknown): Date | null => {
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  if (typeof v !== 'string' || !v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** ¿Es un día «AAAA-MM-DD» válido? */
export function esDiaRecordatorio(v: unknown): v is string {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(new Date(`${v}T12:00:00Z`).getTime());
}

/**
 * Arma una nota desde datos guardados (Firestore o respaldo), con valores por defecto para lo que
 * falte (las notas de antes no traían fijada/recordatorio/papelera/tickets). Null si no trae id.
 */
export function notaDesdeDatos(n: Record<string, unknown> | null | undefined): NotaPersonal | null {
  if (!n || typeof n !== 'object' || !n.id) return null;
  const tickets = Array.isArray(n.tickets)
    ? (n.tickets as Record<string, unknown>[])
        .filter((t) => t && typeof t.id === 'string')
        .map((t) => ({ id: String(t.id), numero: Number(t.numero ?? 0) }))
    : [];
  const imagenes = Array.isArray(n.imagenes)
    ? (n.imagenes as Record<string, unknown>[])
        .filter((i) => i && typeof i.id === 'string')
        .map((i) => ({ id: String(i.id), nombre: String(i.nombre ?? 'imagen') }))
    : [];
  return {
    imagenes,
    id: String(n.id),
    texto: String(n.texto ?? ''),
    color: esColorNota(n.color) ? n.color : 'amarillo',
    creadaEn: fechaDe(n.creadaEn) ?? new Date(0),
    actualizadaEn: fechaDe(n.actualizadaEn) ?? new Date(0),
    fijada: n.fijada === true,
    recordarEn: esDiaRecordatorio(n.recordarEn) ? n.recordarEn : null,
    eliminadaEn: fechaDe(n.eliminadaEn),
    tickets,
  };
}

/** La nota lista para guardar (fechas como texto ISO: van dentro de un arreglo de Firestore). */
export function notaADatos(n: NotaPersonal): Record<string, unknown> {
  return {
    id: n.id,
    texto: n.texto,
    color: n.color,
    creadaEn: n.creadaEn.toISOString(),
    actualizadaEn: n.actualizadaEn.toISOString(),
    fijada: n.fijada,
    recordarEn: n.recordarEn,
    eliminadaEn: n.eliminadaEn ? n.eliminadaEn.toISOString() : null,
    tickets: n.tickets.map((t) => ({ id: t.id, numero: t.numero })),
    imagenes: n.imagenes.map((i) => ({ id: i.id, nombre: i.nombre })),
  };
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
