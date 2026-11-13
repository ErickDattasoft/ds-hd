/**
 * Formato de nombres de DATTASOFT:
 *  - Empresas: SIEMPRE EN MAYÚSCULAS.
 *  - Personas (contactos): Nombre Propio — inicial mayúscula, conectores (de, del, la…) en minúscula.
 * Se aplica al crear/editar y también al leer, así lo ya guardado se ve bien sin migrar nada.
 */

const LOCALE = 'es-MX';
/** Títulos que se escriben con siglas: «CP. Paulina» → «C.P. Paulina». */
const TITULOS: Record<string, string> = { cp: 'C.P.', 'cp.': 'C.P.', 'c.p': 'C.P.', lcp: 'L.C.P.', 'lcp.': 'L.C.P.' };
const CONECTORES = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'e', 'van', 'von', 'da', 'di']);

/** Nombre de empresa en mayúsculas, sin espacios de sobra. */
export function nombreEmpresa(nombre: string): string {
  return nombre.trim().replace(/\s+/g, ' ').toLocaleUpperCase(LOCALE);
}

/** Pone en mayúscula la primera letra de cada parte separada por guion o apóstrofo. */
function capitalizar(palabra: string): string {
  return palabra
    .toLocaleLowerCase(LOCALE)
    .replace(/(^|[-'’.])(\p{L})/gu, (_m, sep: string, letra: string) => sep + letra.toLocaleUpperCase(LOCALE));
}

/** Nombre de persona como «Juno Mendoza de la Cruz», «Lic. Ana López-Pérez», «C.P. Paulina Arceo». */
export function nombrePersona(nombre: string): string {
  const limpio = nombre.trim().replace(/\s+/g, ' ');
  // A veces el «nombre» es un correo (tickets que llegan por correo sin nombre): se deja igual.
  if (limpio.includes('@')) return limpio;
  const palabras = limpio.split(' ');
  return palabras
    .map((p, i) => {
      const min = p.toLocaleLowerCase(LOCALE);
      if (i > 0 && CONECTORES.has(min)) return min;
      if (i === 0 && TITULOS[min]) return TITULOS[min];
      // Siglas con puntos de una letra («C.P.», «S.A.»): todas en mayúscula.
      if (/^(\p{L}\.){2,}$/u.test(p)) return p.toLocaleUpperCase(LOCALE);
      return capitalizar(p);
    })
    .join(' ');
}
