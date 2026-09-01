// Prepara los assets estáticos en public/build y public/vendor.
// Sin bundler ni descargas de red: solo copia desde src/ y node_modules.
import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const buildDir = join(root, 'public', 'build');
const vendorDir = join(root, 'public', 'vendor');

await rm(buildDir, { recursive: true, force: true });
await mkdir(buildDir, { recursive: true });
await mkdir(join(buildDir, 'themes'), { recursive: true });
await mkdir(vendorDir, { recursive: true });

async function copyDir(fromRel, toDir, exts) {
  const from = join(root, fromRel);
  if (!existsSync(from)) return;
  for (const entry of await readdir(from, { withFileTypes: true })) {
    if (entry.isDirectory()) continue;
    if (exts.some((e) => entry.name.endsWith(e))) {
      await cp(join(from, entry.name), join(toDir, entry.name));
      console.log(`build: ${entry.name}`);
    }
  }
}

await copyDir('src/assets/css', buildDir, ['.css']);
await copyDir('src/assets/css/themes', join(buildDir, 'themes'), ['.css']);
await copyDir('src/assets/js', buildDir, ['.js']);

const vendorFiles = [
  ['htmx.org/dist/htmx.min.js', 'htmx.min.js'],
  ['alpinejs/dist/cdn.min.js', 'alpine.min.js'],
];
for (const [from, to] of vendorFiles) {
  const src = join(root, 'node_modules', from);
  if (existsSync(src)) {
    await cp(src, join(vendorDir, to));
    console.log(`vendor: ${to}`);
  } else {
    console.warn(`vendor: no encontrado ${from} (¿npm install?)`);
  }
}

console.log('assets listos.');
