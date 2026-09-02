/**
 * Ensambla `docs/manual/dist/MANUAL-USUARIO-FINAL.md` (audiencia `cliente`) y
 * `MANUAL-STAFF.md` (audiencia `staff`) a partir de `docs/manual/_sources/*.md`.
 *
 * Cada fuente lleva front-matter `{titulo, audiencia: [cliente|staff], rol_minimo, orden}`.
 * Las imágenes que referencian capturas (`docs/manual/screenshots/<modulo>-<paso>.png`) se
 * insertan si el archivo existe; si no (nadie corrió `docs:screenshots` en este checkout),
 * se deja un aviso de texto determinista para que el manual siga siendo válido y el diff
 * de `--check` sea estable.
 *
 * Uso: npm run docs:manuals [-- --check]
 */
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const SOURCES_DIR = join(ROOT, 'docs/manual/_sources');
const SCREENSHOTS_DIR = join(ROOT, 'docs/manual/screenshots');
const DIST_DIR = join(ROOT, 'docs/manual/dist');
const check = process.argv.includes('--check');

type Audiencia = 'cliente' | 'staff';

interface Fuente {
  archivo: string;
  titulo: string;
  audiencia: Audiencia[];
  rolMinimo: string;
  orden: number;
  cuerpo: string;
}

function parseFrontMatter(raw: string, archivo: string): Fuente {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error(`${archivo}: falta front-matter (--- ... ---) al inicio`);
  const fm = m[1] ?? '';
  const cuerpo = m[2] ?? '';
  const datos: Record<string, string> = {};
  for (const linea of fm.split('\n')) {
    const idx = linea.indexOf(':');
    if (idx === -1) continue;
    datos[linea.slice(0, idx).trim()] = linea.slice(idx + 1).trim();
  }
  const titulo = datos.titulo?.replace(/^["']|["']$/g, '') ?? archivo;
  const audienciaRaw = datos.audiencia?.replace(/^\[|\]$/g, '') ?? '';
  const audiencia = audienciaRaw
    .split(',')
    .map((s) => s.trim())
    .filter((s): s is Audiencia => s === 'cliente' || s === 'staff');
  const rolMinimo = datos.rol_minimo ?? '—';
  const orden = Number(datos.orden ?? 999);
  if (audiencia.length === 0)
    throw new Error(
      `${archivo}: audiencia vacía o inválida (usa [staff], [cliente] o [staff, cliente])`,
    );
  return { archivo, titulo, audiencia, rolMinimo, orden, cuerpo: cuerpo.trim() };
}

/** Reemplaza `![alt](../screenshots/x.png)` por la imagen si existe, o un aviso si no. */
function resolverImagenes(cuerpo: string): string {
  return cuerpo.replace(
    /!\[([^\]]*)\]\(\.\.\/screenshots\/([^)]+)\)/g,
    (match, alt: string, archivo: string) => {
      if (existsSync(join(SCREENSHOTS_DIR, archivo))) {
        return `![${alt}](../screenshots/${archivo})`;
      }
      return `*(captura pendiente: ${archivo} — corre \`npm run docs:screenshots\` contra la app corriendo y con datos de \`npm run seed:demo\`)*`;
    },
  );
}

function leerFuentes(): Fuente[] {
  if (!existsSync(SOURCES_DIR)) return [];
  return readdirSync(SOURCES_DIR)
    .filter((f) => f.endsWith('.md'))
    .map((f) => parseFrontMatter(readFileSync(join(SOURCES_DIR, f), 'utf8'), f))
    .sort((a, b) => a.orden - b.orden || a.titulo.localeCompare(b.titulo));
}

function armarManual(titulo: string, fuentes: Fuente[]): string {
  const toc = fuentes.map((f, i) => `${i + 1}. [${f.titulo}](#${slug(f.titulo)})`).join('\n');
  const secciones = fuentes
    .map((f) => `## ${f.titulo}\n\n${resolverImagenes(f.cuerpo)}`)
    .join('\n\n---\n\n');
  return [
    `# ${titulo}`,
    '',
    '> Generado automáticamente por `npm run docs:manuals` desde `docs/manual/_sources/`. No editar a mano.',
    '',
    '## Contenido',
    '',
    toc,
    '',
    '---',
    '',
    secciones,
    '',
  ].join('\n');
}

const COMBINING_MARKS = new RegExp('[̀-ͯ]', 'g');

function slug(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

const fuentes = leerFuentes();
const staff = fuentes.filter((f) => f.audiencia.includes('staff'));
const cliente = fuentes.filter((f) => f.audiencia.includes('cliente'));

const manuales: Record<string, string> = {
  'MANUAL-STAFF.md': armarManual('Manual de staff — ds-hd', staff),
  'MANUAL-USUARIO-FINAL.md': armarManual('Manual de usuario final — Portal de cliente', cliente),
};

if (check) {
  let desactualizado = false;
  for (const [archivo, contenido] of Object.entries(manuales)) {
    const ruta = join(DIST_DIR, archivo);
    const actual = existsSync(ruta) ? readFileSync(ruta, 'utf8') : null;
    if (actual !== contenido) {
      console.error(`${archivo} desactualizado respecto a docs/manual/_sources/.`);
      desactualizado = true;
    }
  }
  if (desactualizado) {
    console.error('Corre `npm run docs:manuals` y commitea el resultado.');
    process.exit(1);
  }
  console.log('Manuales al día.');
} else {
  mkdirSync(DIST_DIR, { recursive: true });
  for (const [archivo, contenido] of Object.entries(manuales)) {
    writeFileSync(join(DIST_DIR, archivo), contenido);
  }
  console.log(
    `Manuales regenerados: ${Object.keys(manuales).join(', ')} (${fuentes.length} fuentes: ${staff.length} staff, ${cliente.length} cliente).`,
  );
}
