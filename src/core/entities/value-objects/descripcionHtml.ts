/**
 * Saneador de HTML para la descripción enriquecida de un ticket (editor con imágenes inline,
 * ver `tickets/form.njk` + `data-editor-html` en `app.js`). Lista blanca estricta — nunca lista
 * negra — implementada sin dependencias (ni `DOMParser` ni una librería de sanitizado: el
 * runtime de Cloudflare Workers no trae DOM, y cualquier librería con dependencias de Node puede
 * tumbar el Worker completo al cargar, como ya pasó con `exceljs`/`multer`). El mismo criterio
 * que `FflateExcelIO`: parseo manual, portátil a Node y Workers por igual.
 *
 * Garantía: el HTML de salida solo contiene las etiquetas y atributos de las listas de abajo;
 * todo lo demás se descarta (las etiquetas de contenido peligroso, su CONTENIDO también se
 * descarta — nunca se "desenvuelven" como texto). El texto se decodifica y se vuelve a escapar
 * siempre (nunca se copia tal cual), para no heredar ninguna ambigüedad del HTML de entrada.
 */

const TAG_RE =
  /<\/?([a-zA-Z][a-zA-Z0-9]*)((?:\s+[a-zA-Z_:][-a-zA-Z0-9_:.]*(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*(\/?)>/g;
const ATTR_RE = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

/** Etiquetas cuyo CONTENIDO se descarta por completo (nunca se muestra como texto). */
const TAGS_CONTENIDO_PELIGROSO = new Set([
  'script',
  'style',
  'iframe',
  'object',
  'embed',
  'svg',
  'math',
  'noscript',
  'template',
]);

/** Etiquetas permitidas en la descripción de un ticket. */
const TAGS_PERMITIDAS = new Set(['b', 'strong', 'i', 'em', 'u', 'ul', 'ol', 'li', 'br', 'div', 'p', 'span', 'img']);
const AUTOCIERRE = new Set(['br', 'img']);

/** Una declaración CSS `propiedad: valor` segura — sin `url()`, `expression()`, ni nada dinámico. */
const ESTILO_DECLARACION_RE =
  /^(max-width|max-height|width|height|float|clear|margin|margin-top|margin-bottom|margin-left|margin-right|display|border-radius|text-align)\s*:\s*[a-zA-Z0-9%.\- ]{1,40}$/;

/** Quita del valor de `style` cualquier declaración que no esté en la lista blanca. */
function limpiarEstilo(valor: string): string | null {
  const declaraciones = valor
    .split(';')
    .map((d) => d.trim())
    .filter(Boolean)
    .filter((d) => ESTILO_DECLARACION_RE.test(d));
  return declaraciones.length ? declaraciones.slice(0, 10).join('; ') : null;
}

/** `data-adj-id` referencia un adjunto propio del ticket — solo un id alfanumérico simple. */
function limpiarAdjId(valor: string): string | null {
  return /^[A-Za-z0-9_-]{1,64}$/.test(valor) ? valor : null;
}

/** El texto alternativo de una imagen — se acota nada más, no hay nada peligroso que validar. */
function limpiarAlt(valor: string): string | null {
  return valor.slice(0, 200);
}

type ValidadorAtributo = (valor: string) => string | null;
const ATRIBUTOS_PERMITIDOS: Record<string, Record<string, ValidadorAtributo>> = {
  img: { 'data-adj-id': limpiarAdjId, alt: limpiarAlt, style: limpiarEstilo },
  div: { style: limpiarEstilo },
  span: { style: limpiarEstilo },
  p: { style: limpiarEstilo },
};

/** Decodifica las entidades que un navegador real emite al serializar texto (`&amp; &lt; …`). */
function decodificarEntidadesBasicas(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;|&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&amp;/g, '&');
}

/** Escapa texto plano para insertarlo de vuelta como contenido de un elemento. */
function escaparTexto(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Escapa un valor para insertarlo de vuelta dentro de `atributo="…"`. */
function escaparAtributo(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Parsea y valida los atributos crudos de una etiqueta contra su lista blanca; arma el `" a=\"b\""` final. */
function parsearAtributos(nombreTag: string, crudo: string): string {
  const permitidos = ATRIBUTOS_PERMITIDOS[nombreTag];
  if (!permitidos || !crudo.trim()) return '';
  let salida = '';
  let m: RegExpExecArray | null;
  ATTR_RE.lastIndex = 0;
  while ((m = ATTR_RE.exec(crudo))) {
    const nombre = m[1]!.toLowerCase();
    const validador = permitidos[nombre];
    if (!validador) continue;
    const crudoValor = m[2] ?? m[3] ?? m[4] ?? '';
    const limpio = validador(decodificarEntidadesBasicas(crudoValor));
    if (limpio === null) continue;
    salida += ` ${nombre}="${escaparAtributo(limpio)}"`;
  }
  return salida;
}

/**
 * Sanea HTML de entrada (del editor de descripción de tickets) a una lista blanca estricta de
 * etiquetas/atributos. Idempotente: sanear un HTML ya saneado da el mismo resultado.
 */
export function sanitizarDescripcionHtml(html: string): string {
  if (!html) return '';
  let salida = '';
  let cursor = 0;
  let tagPeligrosa: string | null = null;
  let profundidadPeligrosa = 0;
  const abiertas: string[] = [];

  TAG_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TAG_RE.exec(html))) {
    const textoPrevio = html.slice(cursor, m.index);
    cursor = TAG_RE.lastIndex;
    const esCierre = m[0][1] === '/';
    const nombre = m[1]!.toLowerCase();
    const atributosCrudos = m[2] ?? '';
    const autocierre = m[3] === '/' || AUTOCIERRE.has(nombre);

    if (tagPeligrosa) {
      if (esCierre && nombre === tagPeligrosa) {
        profundidadPeligrosa--;
        if (profundidadPeligrosa <= 0) tagPeligrosa = null;
      } else if (!esCierre && nombre === tagPeligrosa && !autocierre) {
        profundidadPeligrosa++;
      }
      continue;
    }

    salida += escaparTexto(decodificarEntidadesBasicas(textoPrevio));

    if (esCierre) {
      if (TAGS_PERMITIDAS.has(nombre)) {
        const idx = abiertas.lastIndexOf(nombre);
        if (idx !== -1) {
          while (abiertas.length > idx) salida += `</${abiertas.pop()}>`;
        }
      }
      continue;
    }

    if (TAGS_CONTENIDO_PELIGROSO.has(nombre)) {
      if (!autocierre) {
        tagPeligrosa = nombre;
        profundidadPeligrosa = 1;
      }
      continue;
    }

    if (!TAGS_PERMITIDAS.has(nombre)) continue;

    salida += `<${nombre}${parsearAtributos(nombre, atributosCrudos)}>`;
    if (!autocierre) abiertas.push(nombre);
  }

  salida += escaparTexto(decodificarEntidadesBasicas(html.slice(cursor)));
  while (abiertas.length) salida += `</${abiertas.pop()}>`;
  return salida;
}

/** Texto plano de una descripción HTML — para validar longitud y para vistas sin HTML (búsqueda, Excel). */
export function descripcionATextoPlano(html: string): string {
  if (!html) return '';
  const sinTags = html.replace(/<[^>]*>/g, ' ');
  return decodificarEntidadesBasicas(sinTags).replace(/\s+/g, ' ').trim();
}
