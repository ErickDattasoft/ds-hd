/**
 * Chequeo de frescura de documentación para CI (`npm run docs:check`). Falla si:
 *   1. El README quedaría distinto de correr `npm run docs`.
 *   2. Los manuales (`docs/manual/dist/*.md`) quedarían distintos de correr `npm run docs:manuals`.
 *   3. La referencia de API (`docs/api/`, generada por TypeDoc) quedaría distinta de correr
 *      `npm run docs:api` (comparado con `git diff`, así que solo funciona en un checkout git).
 *   4. Algún paso de `scripts/docs/flows.ts` (capturas de manual) apunta a un `modulo` sin
 *      fuente en `docs/manual/_sources/` — evita que el manual y las capturas diverjan.
 *
 * No requiere Docker ni la app corriendo: los pasos 1-3 son deterministas sobre el código;
 * las capturas (`docs:screenshots`) son aparte y su ausencia no hace fallar este chequeo
 * (`generate-manuals.ts` deja un aviso de texto cuando faltan).
 */
import { spawnSync } from 'node:child_process';
import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { FLOWS, FLUJO_PUBLICO } from './flows.js';

const ROOT = process.cwd();
let ok = true;

function run(label: string, cmd: string, args: string[]): void {
  const res = spawnSync(cmd, args, { stdio: 'inherit' });
  if (res.status !== 0) {
    console.error(`✗ ${label}`);
    ok = false;
  } else {
    console.log(`✓ ${label}`);
  }
}

run('README.md', 'tsx', ['scripts/docs/generate-readme.ts', '--check']);
run('Manuales (docs/manual/dist)', 'tsx', ['scripts/docs/generate-manuals.ts', '--check']);

// TypeDoc: regenera en sitio y verifica que git no vea diferencias.
const td = spawnSync('npx', ['typedoc'], { stdio: 'inherit' });
if (td.status !== 0) {
  console.error('✗ typedoc (fallo al generar docs/api)');
  ok = false;
} else {
  const diff = spawnSync('git', ['diff', '--exit-code', '--stat', '--', 'docs/api'], {
    stdio: 'pipe',
  });
  if (diff.status !== 0) {
    console.error('✗ docs/api desactualizado. Corre `npm run docs:api` y commitea el resultado:');
    console.error(diff.stdout.toString());
    ok = false;
  } else {
    console.log('✓ docs/api');
  }
}

// Coherencia flows.ts ↔ _sources/*.md (por nombre de módulo, sin extensión).
const modulosConFuente = new Set(
  existsSync(join(ROOT, 'docs/manual/_sources'))
    ? readdirSync(join(ROOT, 'docs/manual/_sources'))
        .filter((f) => f.endsWith('.md'))
        .map((f) => f.replace(/\.md$/, '').replace(/^\d+-/, ''))
    : [],
);
const modulosEnFlujos = new Set(
  [...FLOWS.flatMap((f) => f.pasos), ...FLUJO_PUBLICO].map((p) => p.modulo),
);
const huerfanos = [...modulosEnFlujos].filter((m) => !modulosConFuente.has(m));
if (huerfanos.length > 0) {
  console.error(
    `✗ scripts/docs/flows.ts referencia módulos sin fuente en docs/manual/_sources/: ${huerfanos.join(', ')}`,
  );
  ok = false;
} else {
  console.log('✓ flows.ts ↔ docs/manual/_sources');
}

process.exit(ok ? 0 : 1);
