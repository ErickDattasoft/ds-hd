import { compararVersiones } from './value-objects/version.js';

/**
 * Lectura de la página pública de descargas de CONTPAQi (https://old.contpaqi.com/descargas)
 * para proponer las versiones del mercado sin capturarlas a mano.
 *
 * La página es un solo HTML (Zoho Sites) con un bloque por publicación: un `<h2>` con el
 * nombre y la versión, "Versión: …", "Publicado: …", el botón de descarga y, en las versiones
 * normales, la carta técnica. Cada bloque va del `<h2>` al siguiente.
 */

export const URL_DESCARGAS_CONTPAQI = 'https://old.contpaqi.com/descargas';

/** Una publicación de la página, ya interpretada. */
export interface PublicacionContpaqi {
  /** Título tal cual (sin etiquetas): "Service Pack 2 CONTPAQi Comercial Premium® 12.1.0". */
  titulo: string;
  /** Versión base "12.1.0" (del título; si no trae, del campo "Versión:"). */
  base: string;
  tipo: 'version' | 'service_pack' | 'fuera_de_version';
  /** Número de service pack si el título lo dice ("Service Pack 2" → 2; "Service Pack" → 1). */
  sp: number;
  /** AAAA-MM-DD; si la página solo da el mes, el día 01. Vacío si no trae fecha. */
  fecha: string;
  linkDescarga: string;
  linkCartaTecnica: string;
}

/** Lo más nuevo publicado para un sistema del catálogo, en el formato con el que se registra. */
export interface UltimaVersionContpaqi {
  /** "12.1.0 Sp 2" — mismo formato que se captura a mano. */
  version: string;
  fecha: string;
  linkDescarga: string;
  /** La del SP si trae; si no, la de su versión base (los SP casi nunca traen carta). */
  linkCartaTecnica: string;
  /** Título de la publicación en la página, para que se vea de dónde salió. */
  titulo: string;
}

const ENTIDADES: Record<string, string> = { nbsp: ' ', amp: '&', reg: '®', quot: '"', lt: '<', gt: '>', aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú', ntilde: 'ñ', Oacute: 'Ó' };

/** HTML → texto: sin etiquetas, entidades resueltas y espacios colapsados. */
function textoPlano(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (m, e: string) => {
      if (e[0] === '#') {
        const n = e[1] === 'x' || e[1] === 'X' ? Number.parseInt(e.slice(2), 16) : Number.parseInt(e.slice(1), 10);
        return Number.isFinite(n) ? String.fromCodePoint(n) : m;
      }
      return ENTIDADES[e] ?? m;
    })
    .replace(/\s+/g, ' ')
    .trim();
}

/** Minúsculas, sin acentos ni ®, en palabras sueltas. */
function palabras(s: string): string[] {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/** "2026-05-1" → "2026-05-01"; "2026-08" → "2026-08-01"; otra cosa → "". */
function normalizarFecha(s: string): string {
  const m = /^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?$/.exec(s.trim());
  if (!m) return '';
  return `${m[1]}-${m[2]!.padStart(2, '0')}-${(m[3] ?? '1').padStart(2, '0')}`;
}

/**
 * "Etiqueta: valor" directo del HTML, aunque haya etiquetas o &nbsp; de por medio. Se busca
 * sobre el HTML crudo a propósito: quitarle las etiquetas a los ~3 MB de la página costaba
 * más CPU de la que conviene gastar en el Worker.
 */
function campo(html: string, etiqueta: string, valor: string): string | undefined {
  return new RegExp(`${etiqueta}:(?:\\s|&nbsp;|<[^>]*>)*(${valor})`, 'i').exec(html)?.[1];
}

/** Interpreta el HTML de la página de descargas. Bloques sin versión reconocible se saltan. */
export function leerPaginaDescargas(html: string): PublicacionContpaqi[] {
  const limpio = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, '');
  const partes = limpio.split(/<h2\b[^>]*>/i).slice(1);
  const out: PublicacionContpaqi[] = [];
  for (const parte of partes) {
    const fin = parte.search(/<\/h2>/i);
    if (fin < 0) continue;
    const titulo = textoPlano(parte.slice(0, fin));
    if (!titulo) continue;
    const cuerpo = parte.slice(fin);

    // La versión del título manda (el campo "Versión:" a veces trae la del sistema que la contiene).
    const enTitulo = [...titulo.matchAll(/\d+(?:\.\d+)+/g)].pop()?.[0];
    const enCampo = campo(cuerpo, 'Versi(?:ó|&oacute;|o)n', '\\d+(?:\\.\\d+)*');
    const base = enTitulo ?? /\b(\d{1,2})\s*$/.exec(titulo)?.[1] ?? enCampo;
    if (!base) continue;

    const t = palabras(titulo).join(' ');
    const sp = /service pack (\d+)/.exec(t);
    const tipo: PublicacionContpaqi['tipo'] = /solucion fuera de version/.test(t)
      ? 'fuera_de_version'
      : /service pack/.test(t)
        ? 'service_pack'
        : 'version';

    const links = [...cuerpo.matchAll(/href="([^"]+)"/gi)].map((m) => m[1]!.replace(/&amp;/g, '&'));
    out.push({
      titulo,
      base,
      tipo,
      sp: tipo === 'service_pack' ? Number.parseInt(sp?.[1] ?? '1', 10) : 0,
      fecha: normalizarFecha(campo(cuerpo, 'Publicado', '[\\d-]+') ?? ''),
      linkDescarga: links.find((l) => /descargas\.contpaqi\.com/i.test(l)) ?? '',
      // Solo cartas técnicas: los SP traen una *nota* técnica (NotasTecnicas/NT_…), que no se usa.
      linkCartaTecnica: links.find((l) => /carta/i.test(l)) ?? '',
    });
  }
  return out;
}

/**
 * Palabras de un título, calculadas una sola vez: cada sistema del catálogo recorre los ~560
 * títulos y normalizarlos en cada vuelta era lo que más CPU gastaba en el Worker.
 */
const cachePalabras = new Map<string, Set<string>>();
/** Palabras de un título, de la caché de arriba. */
function palabrasDeTitulo(titulo: string): Set<string> {
  let p = cachePalabras.get(titulo);
  if (!p) {
    if (cachePalabras.size > 5000) cachePalabras.clear();
    p = new Set(palabras(titulo));
    cachePalabras.set(titulo, p);
  }
  return p;
}

/** Cómo se llama cada sistema en la página cuando no basta con su propio nombre. */
const ALIAS: Record<string, string[][]> = {
  componentes: [['herramientas', 'complementarias'], ['componentes']],
  'comercial pro': [['comercial', 'pro']],
};

/**
 * ¿La publicación es de este sistema del catálogo? Todas las palabras del nombre (o de un
 * alias) tienen que estar en el título: "Contabilidad" entra en "Contabilidad-Bancos",
 * "Comercial Pro" en "Comercial Start/Pro" pero no en "Comercial Premium".
 */
export function esDelSistema(sistema: string, titulo: string): boolean {
  const nombre = palabras(sistema).filter((p) => p !== 'contpaqi');
  if (!nombre.length) return false;
  const enTitulo = palabrasDeTitulo(titulo);
  const opciones = ALIAS[nombre.join(' ')] ?? [nombre];
  return opciones.some((op) => op.every((p) => enTitulo.has(p)));
}

/**
 * Lo más nuevo de un sistema. Las "Soluciones fuera de versión" se cuentan como service pack
 * de la última versión normal anterior (así se registran: SFV 19.2.2 de Nóminas = "19.2.1 Sp 1").
 */
export function ultimaVersionDe(sistema: string, publicaciones: PublicacionContpaqi[]): UltimaVersionContpaqi | null {
  const propias = publicaciones.filter((p) => esDelSistema(sistema, p.titulo));
  if (!propias.length) return null;
  const normales = propias.filter((p) => p.tipo === 'version');

  const candidatas = propias.map((p) => {
    let base = p.base;
    let sp = p.sp;
    if (p.tipo === 'fuera_de_version') {
      const anterior = normales
        .filter((n) => compararVersiones(n.base, p.base) <= 0)
        .sort((a, b) => compararVersiones(b.base, a.base))[0];
      if (anterior && compararVersiones(anterior.base, p.base) < 0) {
        base = anterior.base;
        // Su número: las SFV de esa misma base, de menor a mayor.
        const hermanas = propias
          .filter((o) => o.tipo === 'fuera_de_version')
          .filter((o) => compararVersiones(anterior.base, o.base) < 0 && compararVersiones(o.base, p.base) <= 0)
          .filter((o) => !normales.some((n) => compararVersiones(anterior.base, n.base) < 0 && compararVersiones(n.base, o.base) <= 0));
        sp = new Set(hermanas.map((o) => o.base)).size;
      }
    }
    return { p, version: sp > 0 ? `${base} Sp ${sp}` : base, base };
  });

  candidatas.sort((a, b) => compararVersiones(b.version, a.version) || b.p.fecha.localeCompare(a.p.fecha));
  const mejor = candidatas[0]!;
  const cartaBase = normales.find((n) => compararVersiones(n.base, mejor.base) === 0 && n.linkCartaTecnica)?.linkCartaTecnica;
  return {
    version: mejor.version,
    fecha: mejor.p.fecha,
    linkDescarga: mejor.p.linkDescarga,
    linkCartaTecnica: mejor.p.linkCartaTecnica || cartaBase || '',
    titulo: mejor.p.titulo,
  };
}

/** Lo último leído de la página (documento `configuracion/versionesContpaqi`). */
export interface EstadoVersionesContpaqi {
  /** ISO de la última lectura que salió bien; null = nunca. */
  revisado: string | null;
  /** Última versión publicada por sistema del catálogo (solo los que se encontraron). */
  ultimas: Record<string, UltimaVersionContpaqi>;
  /** Si la última lectura falló, por qué (vacío si salió bien). */
  error: string;
  /** ISO del último intento (bien o mal), para no leer la página más de una vez al día. */
  intentado: string | null;
}

/** Normaliza lo leído de Firestore (campos faltantes o inválidos → vacío). */
export function sanearEstadoVersionesContpaqi(v: unknown): EstadoVersionesContpaqi {
  const d = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  const iso = (x: unknown) => (typeof x === 'string' && !Number.isNaN(Date.parse(x)) ? x : null);
  const ultimas: Record<string, UltimaVersionContpaqi> = {};
  if (d.ultimas && typeof d.ultimas === 'object') {
    for (const [sistema, u] of Object.entries(d.ultimas as Record<string, Record<string, unknown>>)) {
      if (!u || typeof u.version !== 'string' || !u.version) continue;
      ultimas[sistema] = {
        version: u.version,
        fecha: String(u.fecha ?? ''),
        linkDescarga: String(u.linkDescarga ?? ''),
        linkCartaTecnica: String(u.linkCartaTecnica ?? ''),
        titulo: String(u.titulo ?? ''),
      };
    }
  }
  return { revisado: iso(d.revisado), ultimas, error: String(d.error ?? ''), intentado: iso(d.intentado) };
}
