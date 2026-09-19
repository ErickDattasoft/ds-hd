/**
 * Utilidades del importador del CRM viejo, sin nada de Node (`node:crypto`, `node:fs`,
 * `process`) — este módulo corre igual en el script de migración y dentro del worker de
 * Cloudflare que sirve la app, que es lo que permite ofrecer el botón "Importar respaldo
 * del CRM viejo" en la UI y no solo por terminal.
 */

export const arr = (v: unknown): Record<string, unknown>[] =>
  Array.isArray(v) ? (v as Record<string, unknown>[]) : [];

const RE_DIACRITICOS = new RegExp('[\\u0300-\\u036f]', 'g');

/** Slug ascii simple para ids legibles y deterministas (mismo texto → mismo id). */
export function slug(texto: string): string {
  const limpio = texto
    .normalize('NFD')
    .replace(RE_DIACRITICOS, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return limpio || 'sin-nombre';
}

/**
 * Id determinista corto a partir de campos que identifican el registro (el respaldo viejo no
 * trae ids propios) — así reimportar no duplica nada.
 *
 * Es SHA-1 por WebCrypto, que da exactamente el mismo hexadecimal que el `node:crypto` que
 * usaba el script antes: los ids generados aquí siguen coincidiendo con los de la migración
 * que ya corrió contra el proyecto real, y por eso reimportar sigue siendo un no-op.
 */
export async function hashId(prefijo: string, ...partes: string[]): Promise<string> {
  const datos = new TextEncoder().encode(partes.join('|'));
  const buf = await crypto.subtle.digest('SHA-1', datos);
  const h = [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16);
  return `${prefijo}-${h}`;
}

/** Fecha desde los varios formatos que mezcla el CRM viejo (ISO, epoch, Timestamp). */
export function fechaDe(v: unknown): Date {
  if (typeof v === 'number') return new Date(v);
  if (typeof v === 'string') {
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return d;
  }
  if (v && typeof v === 'object' && 'seconds' in (v as Record<string, unknown>)) {
    return new Date(Number((v as { seconds: number }).seconds) * 1000);
  }
  return new Date();
}

/** Desempaqueta el wrapper `{version, app, fecha, datos: {...}}` del botón "Respaldar". */
export function seccionDatos(raw: Record<string, unknown>): Record<string, unknown> {
  return (raw.datos as Record<string, unknown>) ?? raw;
}

/**
 * ¿Este JSON tiene pinta de respaldo del CRM viejo? (para rechazar archivos equivocados).
 *
 * Se mira solo por claves EXCLUSIVAS del formato viejo: `contactos`, `tickets` y `usuarios`
 * existen igual en el backup propio de ds-hd, así que aceptarlas dejaría pasar un archivo del
 * sistema nuevo — que es justo el error que hay que atajar, porque el importador no encuentra
 * nada dentro y termina en un "OK" con todos los contadores en cero.
 */
export function pareceRespaldoViejo(raw: Record<string, unknown>): boolean {
  const d = seccionDatos(raw);
  const exclusivasArray = ['clientes', 'knowledge_base', 'bitacora', 'papelera'];
  const exclusivasObjeto = ['versionesMercado', 'cartasTecnicas', 'configTickets'];
  return (
    exclusivasArray.some((k) => Array.isArray(d[k])) ||
    exclusivasObjeto.some((k) => Boolean(d[k]) && typeof d[k] === 'object')
  );
}
