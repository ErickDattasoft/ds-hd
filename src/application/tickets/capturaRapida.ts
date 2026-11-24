/**
 * «⚡ Captura rápida»: convierte notas sueltas (p. ej. las notas adhesivas de Windows) en
 * borradores de ticket. Cada nota suele empezar con un encabezado como
 *   «CANUL Y ASOCIADOS - ALFONSO 28/10/2026»
 *   «DRA CINTIA RUIZ - CEDIME - ALFONSO - 21/10/2026 - 26/10/2026»
 * y abajo lo que pasó. De aquí se adivina empresa, contacto, agente, fecha y sistema; la
 * persona revisa y corrige todo en una tabla antes de crear nada.
 */

/** Lo que se conoce para reconocer los datos de una nota. */
export interface CatalogosCaptura {
  empresas: readonly { id: string; nombre: string }[];
  contactos: readonly { nombre: string; email: string | null; empresaId: string }[];
  agentes: readonly { uid: string; nombre: string }[];
  sistemas: readonly string[];
}

/** Borrador de ticket sacado de una nota. */
export interface NotaInterpretada {
  /** La nota completa, tal cual se pegó. */
  texto: string;
  /** «AAAA-MM-DD» o null si la nota no trae fecha. */
  fecha: string | null;
  empresaId: string | null;
  empresaNombre: string;
  contactoNombre: string;
  contactoCorreo: string;
  agenteUid: string | null;
  sistema: string;
  asunto: string;
  /** Lo del encabezado que no se reconoció (p. ej. el nombre de quien llamó). */
  solicitadoPor: string;
}

const FECHA = /\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})\b/;
const SEPARADOR = /^\s*([-=_*~]\s*){3,}$/;
const SUFIJOS = /\b(S\s?A\s?P?\s?I?\s?(DE\s?)?(C\s?V)?|S\s?DE\s?R\s?L(\s?DE\s?C\s?V)?|S\s?C|A\s?C|SAS)\s*$/;

/** Mayúsculas, sin acentos y sin signos: para comparar nombres escritos a la carrera. */
export function normalizar(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9Ñ]+/g, ' ')
    .trim();
}

const sinSufijo = (n: string): string => n.replace(SUFIJOS, '').trim() || n;
const soloFecha = (l: string): boolean => /^\s*\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}\s*$/.test(l);

/** «21/10/2026» → «2026-10-21» (null si no es una fecha válida). */
export function fechaDeTexto(s: string): string | null {
  const m = FECHA.exec(s);
  if (!m) return null;
  const d = Number(m[1]);
  const mes = Number(m[2]);
  let a = Number(m[3]);
  if (a < 100) a += 2000;
  if (mes < 1 || mes > 12 || d < 1 || d > 31 || a < 2000 || a > 2100) return null;
  const f = new Date(Date.UTC(a, mes - 1, d));
  if (f.getUTCMonth() !== mes - 1) return null;
  return `${a}-${String(mes).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/**
 * Parte el texto pegado en notas. Empieza nota nueva una línea de separación («---») o un
 * renglón con fecha que parece encabezado (trae « - » o va solo). Los renglones con fecha
 * dentro del cuerpo («se instaló el 22/10/2026») no parten la nota.
 */
export function separarNotas(texto: string): string[] {
  const lineas = texto.replace(/\r/g, '').split('\n');
  const notas: string[][] = [];
  let actual: string[] = [];
  const cerrar = (): void => {
    while (actual.length && !actual[actual.length - 1]!.trim()) actual.pop();
    while (actual.length && !actual[0]!.trim()) actual.shift();
    if (actual.length) notas.push(actual);
    actual = [];
  };
  for (let i = 0; i < lineas.length; i++) {
    const l = lineas[i]!;
    if (SEPARADOR.test(l)) {
      cerrar();
      continue;
    }
    const conContenido = actual.some((x) => x.trim());
    if (soloFecha(l)) {
      // La fecha que el programa de notas pone arriba de cada nota: si el siguiente renglón ya es
      // un encabezado con su propia fecha, esta sobra; si no, ella abre la nota.
      const sig = lineas.slice(i + 1).find((x) => x.trim()) ?? '';
      if (fechaDeTexto(sig) && /\s-\s/.test(sig)) {
        cerrar();
        continue;
      }
      if (conContenido) cerrar();
      actual.push(l);
      continue;
    }
    if (conContenido && fechaDeTexto(l) && /\s-\s/.test(l)) cerrar();
    actual.push(l);
  }
  cerrar();
  return notas.map((n) => n.join('\n'));
}

/** ¿El texto (ya normalizado) contiene `frase` como palabras completas? */
const contiene = (texto: string, frase: string): boolean =>
  frase.length > 0 && ` ${texto} `.includes(` ${frase} `);

/** Interpreta una nota con los catálogos del CRM. */
export function interpretarNota(texto: string, cat: CatalogosCaptura): NotaInterpretada {
  const lineas = texto.split('\n').map((l) => l.trim());
  const iEnc = lineas.findIndex((l) => l && !soloFecha(l));
  const encabezado = iEnc >= 0 ? lineas[iEnc]! : '';
  const cuerpo = lineas.slice(iEnc + 1).filter(Boolean);

  const fecha = fechaDeTexto(encabezado) ?? lineas.map(fechaDeTexto).find(Boolean) ?? null;

  // Pedazos del encabezado separados por « - », sin fechas.
  const pedazos = encabezado
    .split(/\s+[-–—]\s+|\s+[-–—]$|^[-–—]\s+/)
    .map((p) => p.replace(new RegExp(FECHA.source, 'g'), ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  // Agente: un pedazo que es su nombre o empieza con él («Alfonso TRANSFORMADORES…»).
  let agenteUid: string | null = null;
  const restantes: string[] = [];
  for (const p of pedazos) {
    const np = normalizar(p);
    if (!agenteUid) {
      const ag = cat.agentes.find((a) => {
        const na = normalizar(a.nombre);
        const pila = na.split(' ')[0] ?? '';
        return np === na || np === pila || (pila.length >= 3 && np.startsWith(`${pila} `)) || np.startsWith(`${na} `);
      });
      if (ag) {
        agenteUid = ag.uid;
        const na = normalizar(ag.nombre);
        const quitar = np.startsWith(`${na} `) || np === na ? na : (na.split(' ')[0] ?? '');
        const resto = p.split(/\s+/).slice(quitar.split(' ').length).join(' ').trim();
        if (resto) restantes.push(resto);
        continue;
      }
    }
    restantes.push(p);
  }

  // Empresa: primero un pedazo igual al nombre; luego el nombre dentro del encabezado (el más
  // largo gana); luego un contacto conocido; al último, palabras en común.
  const empresas = cat.empresas.map((e) => ({ ...e, n: normalizar(e.nombre), c: sinSufijo(normalizar(e.nombre)) }));
  const usados = new Set<string>();
  let empresa: (typeof empresas)[number] | null = null;
  for (const p of restantes) {
    const np = sinSufijo(normalizar(p));
    const e = empresas.find((x) => x.c === np || x.n === np);
    if (e) {
      empresa = e;
      usados.add(p);
      break;
    }
  }
  const encNorm = normalizar(restantes.join(' - '));
  if (!empresa) {
    empresa =
      empresas
        .filter((x) => x.c.length >= 4 && contiene(encNorm, x.c))
        .sort((a, b) => b.c.length - a.c.length)[0] ?? null;
    if (empresa) for (const p of restantes) if (contiene(normalizar(p), empresa.c) || contiene(empresa.c, normalizar(p))) usados.add(p);
  }

  let contactoNombre = '';
  let contactoCorreo = '';
  const contactosDe = (empresaId: string | null) => cat.contactos.filter((c) => !empresaId || c.empresaId === empresaId);
  for (const p of restantes) {
    const np = normalizar(p);
    if (np.length < 4) continue;
    const c = contactosDe(empresa?.id ?? null).find((x) => {
      const nc = normalizar(x.nombre);
      return nc === np || (np.split(' ').length >= 2 && nc.startsWith(`${np} `));
    });
    if (c) {
      contactoNombre = c.nombre;
      contactoCorreo = c.email ?? '';
      usados.add(p);
      if (!empresa) empresa = empresas.find((e) => e.id === c.empresaId) ?? null;
      break;
    }
  }

  if (!empresa) {
    let mejor = 0;
    for (const p of restantes) {
      const palabras = new Set(normalizar(p).split(' ').filter((w) => w.length >= 3));
      if (!palabras.size) continue;
      for (const e of empresas) {
        const pe = e.c.split(' ').filter((w) => w.length >= 3);
        if (!pe.length) continue;
        const comunes = pe.filter((w) => palabras.has(w)).length;
        const puntos = comunes / Math.max(pe.length, palabras.size);
        if (comunes && puntos >= 0.5 && puntos > mejor) {
          mejor = puntos;
          empresa = e;
          usados.clear();
          usados.add(p);
        }
      }
    }
  }

  // Sistema mencionado en cualquier parte de la nota (el nombre más largo gana).
  const todo = normalizar(texto);
  const sistema =
    [...cat.sistemas]
      .filter((s) => contiene(todo, normalizar(s)))
      .sort((a, b) => b.length - a.length)[0] ?? '';

  const asunto = (cuerpo[0] ?? encabezado).slice(0, 150);
  const solicitadoPor = restantes.filter((p) => !usados.has(p)).join(' - ');

  return {
    texto,
    fecha,
    empresaId: empresa?.id ?? null,
    empresaNombre: empresa?.nombre ?? '',
    contactoNombre,
    contactoCorreo,
    agenteUid,
    sistema,
    asunto,
    solicitadoPor,
  };
}

/** Texto plano de la nota → HTML simple para la descripción del ticket. */
export function descripcionDeNota(texto: string): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return texto
    .trim()
    .split(/\n{2,}/)
    .map((par) => `<p>${par.split('\n').map(esc).join('<br>')}</p>`)
    .join('');
}
