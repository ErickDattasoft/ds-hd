/**
 * Comparación de versiones de sistemas CONTPAQi/Compac.
 *
 * Formato real: número con puntos y, opcionalmente, un "service pack" (`16.3.1 SP2`,
 * `14.0.0`, `NO APLICA`). Se compara componente a componente y luego el SP.
 * Portado del CRM en producción (`compararVersiones` en `index.astro`).
 */

/** Estado de la versión instalada de un sistema frente a la versión oficial. */
export type EstadoActualizacion = 'sin_oficial' | 'sin_dato' | 'actualizada' | 'desactualizada';

/** Versión descompuesta en sus componentes numéricos y el número de service pack. */
interface VersionParseada {
  base: number[];
  sp: number;
}

/** Descompone `16.3.1 SP2` en `{ base: [16,3,1], sp: 2 }`. */
function parsear(v: string): VersionParseada {
  const sp = /sp\s*(\d+)/.exec(v);
  const base = v
    .split(/sp/)[0]!
    .replace(/[^0-9.]/g, '')
    .split('.')
    .map((n) => Number.parseInt(n, 10) || 0);
  return { base, sp: sp ? Number.parseInt(sp[1]!, 10) : 0 };
}

/**
 * Compara la versión instalada (`instalada`) con la oficial (`oficial`).
 * Devuelve `-1` si la instalada es menor, `0` si son equivalentes (o no hay con qué
 * comparar) y `1` si la instalada es mayor.
 */
export function compararVersiones(instalada: string, oficial: string): -1 | 0 | 1 {
  const vI = String(instalada ?? '').toLowerCase().trim();
  const vO = String(oficial ?? '').toLowerCase().trim();
  if (!vO) return 0;
  if (!vI || vI === 'no aplica') return -1;
  if (vI === vO) return 0;

  const pI = parsear(vI);
  const pO = parsear(vO);
  const largo = Math.max(pI.base.length, pO.base.length);
  for (let i = 0; i < largo; i++) {
    const a = pI.base[i] ?? 0;
    const b = pO.base[i] ?? 0;
    if (a < b) return -1;
    if (a > b) return 1;
  }
  if (pI.sp < pO.sp) return -1;
  if (pI.sp > pO.sp) return 1;
  return 0;
}

/** Clasifica la versión instalada frente a la oficial. */
export function estadoActualizacion(instalada: string | null | undefined, oficial: string | null | undefined): EstadoActualizacion {
  if (!oficial || !oficial.trim()) return 'sin_oficial';
  if (!instalada || !instalada.trim()) return 'sin_dato';
  return compararVersiones(instalada, oficial) < 0 ? 'desactualizada' : 'actualizada';
}
