import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import type { ColumnaExcel, IExcelIO } from '../../core/ports/services/IExcelIO.js';

/**
 * Implementación de {@link IExcelIO} sin dependencias de Node (zip vía `fflate`, XML
 * armado/parseado a mano) — para cuando corre en Cloudflare Workers. `exceljs` (usado por
 * {@link ExceljsExcelIO}) no arranca ahí: su cadena de dependencias (`readable-stream`)
 * hace `util.inherits` sobre una base que `workerd` no expone con `.prototype`, y eso
 * revienta el Worker completo al cargar el módulo (no solo las rutas de Excel). El build
 * de Workers (`scripts/build-worker.mjs`) sustituye `ExceljsExcelIO` por esta clase.
 *
 * Escribe con "inline strings" (sin `sharedStrings.xml`); al leer soporta también el
 * formato de `exceljs` (`t="s"` + `xl/sharedStrings.xml`) para que un archivo exportado en
 * un entorno se pueda importar en el otro sin problema.
 */
export class FflateExcelIO implements IExcelIO {
  async escribir(hoja: string, columnas: ColumnaExcel[], filas: Record<string, string>[]): Promise<Buffer> {
    const encabezados = filaXml(1, columnas.map((c) => c.header), true);
    const cuerpo = filas.map((fila, i) => filaXml(i + 2, columnas.map((c) => fila[c.key] ?? ''), false));
    const sheetXml =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      `<sheetData>${encabezados}${cuerpo.join('')}</sheetData></worksheet>`;

    const archivos = {
      '[Content_Types].xml': strToU8(CONTENT_TYPES_XML),
      '_rels/.rels': strToU8(PACKAGE_RELS_XML),
      'xl/workbook.xml': strToU8(workbookXml(hoja)),
      'xl/_rels/workbook.xml.rels': strToU8(WORKBOOK_RELS_XML),
      'xl/styles.xml': strToU8(STYLES_XML),
      'xl/worksheets/sheet1.xml': strToU8(sheetXml),
    };
    return Buffer.from(zipSync(archivos, { level: 6 }));
  }

  async leer(buffer: Buffer): Promise<Record<string, string>[]> {
    const archivos = unzipSync(new Uint8Array(buffer));
    const hojaKey =
      Object.keys(archivos).find((k) => /^xl\/worksheets\/sheet1\.xml$/i.test(k)) ??
      Object.keys(archivos).find((k) => /^xl\/worksheets\/.*\.xml$/i.test(k));
    if (!hojaKey) return [];

    const sharedStrings = archivos['xl/sharedStrings.xml']
      ? parseSharedStrings(strFromU8(archivos['xl/sharedStrings.xml']))
      : [];
    return parseFilas(strFromU8(archivos[hojaKey]!), sharedStrings);
  }
}

// ── Escritura: plantillas OOXML mínimas ──────────────────────────────────────

const CONTENT_TYPES_XML =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
  '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
  '<Default Extension="xml" ContentType="application/xml"/>' +
  '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
  '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
  '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
  '</Types>';

const PACKAGE_RELS_XML =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
  '</Relationships>';

const WORKBOOK_RELS_XML =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
  '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
  '</Relationships>';

// fontId 0 = normal, 1 = negritas (para el encabezado); cellXfs 0 = normal, 1 = negritas.
const STYLES_XML =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
  '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>' +
  '<fills count="1"><fill><patternFill patternType="none"/></fill></fills>' +
  '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
  '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
  '<cellXfs count="2">' +
  '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
  '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
  '</cellXfs>' +
  '</styleSheet>';

function workbookXml(hoja: string): string {
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    `<sheets><sheet name="${escXml(hoja)}" sheetId="1" r:id="rId1"/></sheets></workbook>`
  );
}

function filaXml(fila: number, valores: string[], encabezado: boolean): string {
  const celdas = valores
    .map((v, i) => {
      const ref = `${colLetra(i + 1)}${fila}`;
      const estilo = encabezado ? ' s="1"' : '';
      return `<c r="${ref}" t="inlineStr"${estilo}><is><t xml:space="preserve">${escXml(v)}</t></is></c>`;
    })
    .join('');
  return `<row r="${fila}">${celdas}</row>`;
}

function colLetra(n: number): string {
  let letra = '';
  while (n > 0) {
    const resto = (n - 1) % 26;
    letra = String.fromCharCode(65 + resto) + letra;
    n = Math.floor((n - 1) / 26);
  }
  return letra;
}

function escXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── Lectura ───────────────────────────────────────────────────────────────

function unescXml(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, '&');
}

function colIndice(letra: string): number {
  let n = 0;
  for (const ch of letra) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
}

/** Extrae el texto de cada `<si>` de `xl/sharedStrings.xml` (texto plano o `<r><t>` en runs). */
function parseSharedStrings(xml: string): string[] {
  const out: string[] = [];
  const siRe = /<si>([\s\S]*?)<\/si>/g;
  let m: RegExpExecArray | null;
  while ((m = siRe.exec(xml))) {
    let texto = '';
    const tRe = /<t[^>]*>([\s\S]*?)<\/t>/g;
    let tm: RegExpExecArray | null;
    while ((tm = tRe.exec(m[1]!))) texto += unescXml(tm[1]!);
    out.push(texto);
  }
  return out;
}

/** Filas de una hoja `sheetN.xml`: soporta `t="inlineStr"`, `t="s"` (shared strings) y numéricas. */
function parseFilas(xml: string, sharedStrings: string[]): Record<string, string>[] {
  const filas: Record<string, string>[] = [];
  let headers: string[] = [];
  const rowRe = /<row\b[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g;
  let rowMatch: RegExpExecArray | null;
  while ((rowMatch = rowRe.exec(xml))) {
    const numeroFila = Number(rowMatch[1]);
    const celdas = celdasDeFila(rowMatch[2]!, sharedStrings);
    if (numeroFila === 1) {
      headers = [];
      for (const { col, valor } of celdas) headers[colIndice(col) - 1] = valor;
      continue;
    }
    const obj: Record<string, string> = {};
    let tieneAlgo = false;
    for (const { col, valor } of celdas) {
      const header = headers[colIndice(col) - 1];
      if (!header) continue;
      obj[header] = valor;
      if (valor) tieneAlgo = true;
    }
    if (tieneAlgo) filas.push(obj);
  }
  return filas;
}

function celdasDeFila(rowXml: string, sharedStrings: string[]): { col: string; valor: string }[] {
  const out: { col: string; valor: string }[] = [];
  const cellRe = /<c\s+([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
  let m: RegExpExecArray | null;
  while ((m = cellRe.exec(rowXml))) {
    const attrs = m[1]!;
    const inner = m[2] ?? '';
    const refMatch = /r="([A-Z]+)\d+"/.exec(attrs);
    if (!refMatch) continue;
    const col = refMatch[1]!;
    const tipo = /t="([^"]+)"/.exec(attrs)?.[1] ?? 'n';
    let valor = '';
    if (tipo === 'inlineStr') {
      valor = unescXml(/<t[^>]*>([\s\S]*?)<\/t>/.exec(inner)?.[1] ?? '');
    } else if (tipo === 's') {
      const idx = Number(/<v>([\s\S]*?)<\/v>/.exec(inner)?.[1] ?? -1);
      valor = sharedStrings[idx] ?? '';
    } else {
      valor = unescXml(/<v>([\s\S]*?)<\/v>/.exec(inner)?.[1] ?? '');
    }
    out.push({ col, valor });
  }
  return out;
}
