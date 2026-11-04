import { ValidationError } from '../../errors/DomainError.js';

/**
 * Estados de facturación «de fábrica». Tienen clave fija porque el sistema los reconoce
 * (p. ej. `facturado`/`factura_mensual` cuentan como factura emitida). El catálogo que se ve en
 * pantalla es editable en Configuración → Tickets (como en el CRM viejo): lo que se agregue ahí
 * se guarda en el ticket con su propio texto como valor.
 */
export const ESTADOS_FACTURACION = [
  'no_facturado',
  'en_proceso',
  'facturado',
  'garantia',
  'no_aplica',
  'factura_mensual',
  'consulta_sin_costo',
] as const;

export type EstadoFacturacionBase = (typeof ESTADOS_FACTURACION)[number];

/** Clave de fábrica o el texto de un estado agregado en Configuración. */
export type EstadoFacturacion = string;

export const ETIQUETAS_FACTURACION: Record<EstadoFacturacionBase, string> = {
  no_facturado: 'No facturado',
  en_proceso: 'En proceso',
  facturado: 'Facturado',
  garantia: 'Garantía',
  no_aplica: 'No aplica',
  factura_mensual: 'Factura mensual',
  consulta_sin_costo: 'Consulta sin costo',
};

/** Catálogo con el que arranca Configuración → Tickets → Facturación. */
export const CATALOGO_FACTURACION_POR_DEFECTO: readonly string[] = ESTADOS_FACTURACION.map((e) => ETIQUETAS_FACTURACION[e]);

const MAX = 60;
const normal = (t: string): string =>
  t.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');

/** Sinónimos (sobre todo los textos del CRM viejo) → clave de fábrica. */
const SINONIMOS: Record<string, EstadoFacturacionBase> = {
  'no aplica facturacion': 'no_aplica',
};

/** Texto que se ve en pantalla para un estado guardado. */
export function etiquetaFacturacion(estado: EstadoFacturacion): string {
  return (ETIQUETAS_FACTURACION as Record<string, string>)[estado] ?? estado;
}

/**
 * Valor que se guarda en el ticket para un texto del catálogo: si coincide con uno de fábrica
 * (sin importar mayúsculas/acentos, o es su clave) se usa la clave; si no, el texto tal cual.
 */
export function valorFacturacion(texto: string): EstadoFacturacion {
  const t = String(texto ?? '').trim().slice(0, MAX);
  if ((ESTADOS_FACTURACION as readonly string[]).includes(t)) return t;
  const n = normal(t);
  const base = ESTADOS_FACTURACION.find((e) => normal(ETIQUETAS_FACTURACION[e]) === n);
  return base ?? SINONIMOS[n] ?? t;
}

/** Opciones de `<select>` a partir del catálogo configurado (+ el actual del ticket si ya no está). */
export function opcionesFacturacion(
  catalogo: readonly string[] | undefined,
  actual?: EstadoFacturacion,
): { valor: string; etiqueta: string }[] {
  const lista = catalogo && catalogo.length ? catalogo : CATALOGO_FACTURACION_POR_DEFECTO;
  const out: { valor: string; etiqueta: string }[] = [];
  for (const texto of lista) {
    const valor = valorFacturacion(texto);
    if (valor && !out.some((o) => o.valor === valor)) out.push({ valor, etiqueta: texto.trim() });
  }
  if (actual && !out.some((o) => o.valor === actual)) out.push({ valor: actual, etiqueta: etiquetaFacturacion(actual) });
  return out;
}

/** Type guard: ¿el valor sirve como estado de facturación? (texto no vacío y corto). */
export function esEstadoFacturacion(v: unknown): v is EstadoFacturacion {
  return typeof v === 'string' && v.trim().length > 0 && v.trim().length <= MAX;
}

/** Valida y normaliza un estado de facturación recibido de un formulario. */
export function parseEstadoFacturacion(v: unknown): EstadoFacturacion {
  if (!esEstadoFacturacion(v)) {
    throw new ValidationError(`Estado de facturación inválido: ${String(v)}`, {
      estadoFacturacion: 'No reconocido',
    });
  }
  return valorFacturacion(v);
}

/**
 * Normaliza el estado leído de props/Firestore, con respaldo al esquema viejo
 * (`facturacion.facturado: boolean`, sin `estado`) para no romper tickets ya guardados.
 */
export function sanearEstadoFacturacion(estado: unknown, facturadoLegacy: unknown): EstadoFacturacion {
  if (esEstadoFacturacion(estado)) return estado.trim();
  return facturadoLegacy === true ? 'facturado' : 'no_facturado';
}

/** ¿Este estado representa una factura ya emitida? (dispara el webhook `ticket.facturado`). */
export function esFacturacionCompletada(estado: EstadoFacturacion): boolean {
  return estado === 'facturado' || estado === 'factura_mensual';
}
