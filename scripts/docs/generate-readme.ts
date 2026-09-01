/**
 * Regenera los bloques `<!-- GENERATED:x START/END -->` del README a partir del código
 * (fuente única de verdad). Con `--check` no escribe: sale con código 1 si el README
 * quedaría distinto (lo usa la CI).
 *
 * Bloques soportados en Fase 0:
 *   - env: tabla de variables de entorno desde el esquema zod de src/config/env.ts
 * (se irán agregando: endpoints, módulos, ports↔adapters, matriz RBAC, modelo de datos)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { z } from 'zod';
import { envSchema } from '../../src/config/env.js';

const README = join(process.cwd(), 'README.md');
const check = process.argv.includes('--check');

function envTable(): string {
  const shape = envSchema.shape as Record<string, z.ZodTypeAny>;
  const rows = Object.entries(shape).map(([name, schema]) => {
    const description = schema.description ?? '';
    const opcional = schema.safeParse(undefined).success ? 'sí' : 'no';
    return `| \`${name}\` | ${opcional} | ${description} |`;
  });
  return ['| Variable | Opcional | Descripción |', '| --- | --- | --- |', ...rows].join('\n');
}

const blocks: Record<string, () => string> = {
  env: envTable,
};

function replaceBlock(content: string, name: string, body: string): string {
  const start = `<!-- GENERATED:${name} START -->`;
  const end = `<!-- GENERATED:${name} END -->`;
  const re = new RegExp(`${start}[\\s\\S]*?${end}`);
  if (!re.test(content)) {
    throw new Error(`No se encontró el bloque ${start} ... ${end} en README.md`);
  }
  return content.replace(re, `${start}\n\n${body}\n\n${end}`);
}

let content = readFileSync(README, 'utf8');
for (const [name, build] of Object.entries(blocks)) {
  content = replaceBlock(content, name, build());
}

const current = readFileSync(README, 'utf8');
if (check) {
  if (current !== content) {
    console.error('README.md desactualizado. Corre `npm run docs` y commitea el resultado.');
    process.exit(1);
  }
  console.log('README.md al día.');
} else {
  writeFileSync(README, content);
  console.log('README.md regenerado.');
}
