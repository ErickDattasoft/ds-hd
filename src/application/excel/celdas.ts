/**
 * Lectura de celdas de un Excel importado, compartida por empresas y contactos.
 *
 * Una columna que el archivo NO trae deja el dato como está (`undefined`); una que sí trae
 * pero vacía lo borra (`''`). Sin esa distinción, actualizar desde un Excel con menos
 * columnas borraba notas, vigencias y demás datos que el archivo ni mencionaba.
 */
export type Fila = Record<string, string>;

/** Encabezados presentes en la hoja (una celda vacía al final de un renglón no siempre llega). */
export const columnasDe = (filas: Fila[]): Set<string> => new Set(filas.flatMap((f) => Object.keys(f)));

/** Valor de la primera de `nombres` que exista en la hoja; `undefined` si ninguna existe. */
export function celda(fila: Fila, columnas: Set<string>, ...nombres: string[]): string | undefined {
  const nombre = nombres.find((n) => columnas.has(n));
  return nombre === undefined ? undefined : (fila[nombre] ?? '').trim();
}

/** Separa una celda con uno o varios correos ("a@x.mx, b@x.mx" o con `;`). */
export const correosDe = (v: string | undefined): string[] =>
  (v ?? '')
    .split(/[,;\s]+/)
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
