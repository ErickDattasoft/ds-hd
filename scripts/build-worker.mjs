// Empaqueta la app para Cloudflare Workers: un solo módulo ESM + los assets estáticos.
//
// Pasos:
//  1. Precompila las vistas Nunjucks a JS (en Workers no hay filesystem para FileSystemLoader).
//  2. Bundlea `src/main.worker.ts` con esbuild, sustituyendo `config/firebase.ts` por un stub
//     — así `firebase-admin`/gRPC (que no corre en Workers) queda fuera del bundle.
//  3. Copia `public/` a `worker-dist/assets/static/` para el binding de assets de CF.
//
// El resultado (`worker-dist/`) lo consume `wrangler deploy` (ver `wrangler.jsonc`).
import { build } from 'esbuild';
import nunjucks from 'nunjucks';
import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'worker-dist');
const assetsStaticDir = join(outDir, 'assets', 'static');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

await rm(outDir, { recursive: true, force: true });
await mkdir(assetsStaticDir, { recursive: true });
await mkdir(join(outDir, 'stubs'), { recursive: true });

// ── 1. Vistas Nunjucks precompiladas ─────────────────────────────────────────
const precompiled = nunjucks
  .precompile(join(root, 'src', 'views'), { include: [/\.njk$/] })
  .replaceAll('window.nunjucksPrecompiled', 'globalThis.nunjucksPrecompiled');
await writeFile(join(outDir, 'views-precompiled.js'), precompiled);
const nViews = (precompiled.match(/globalThis\.nunjucksPrecompiled \|\| \{\}\)\[/g) ?? []).length;
console.log(`build-worker: ${nViews} vistas precompiladas`);

// ── 2. Stubs de módulos solo-Node (nunca se ejecutan en la ruta `runtime: 'workers'`) ──
// Se sustituyen en el bundle porque su código de carga rompe en `workerd`:
//  - firebase-admin: gRPC (no soportado en Workers bajo ninguna bandera).
//  - compression: `debug` → `node:tty` (no implementado en workerd). CF ya comprime en el edge.
//  - pino / pino-http: `thread-stream` (worker threads) + `sonic-boom` (fd). Se usa ConsoleLogger.
const stubs = {
  'config/firebase.js': {
    match: (a) =>
      /firebase\.js$/.test(a.path) &&
      (/[/\\]config[/\\]/.test(a.importer) || /[/\\]config$/.test(a.resolveDir)),
    code: `export function initFirebase() {
  throw new Error('initFirebase no está disponible en Cloudflare Workers (usar FIRESTORE_DRIVER=rest).');
}
`,
  },
  compression: {
    match: (a) => a.path === 'compression',
    code: `export default () => (_req, _res, next) => next();\n`,
  },
  'pino-http': {
    match: (a) => a.path === 'pino-http',
    code: `export default () => (_req, _res, next) => next();\nexport const pinoHttp = () => (_req, _res, next) => next();\n`,
  },
  pino: {
    match: (a) => a.path === 'pino',
    code: `const pino = () => { throw new Error('pino no corre en Workers (usar ConsoleLogger).'); };
export { pino };
export default pino;
`,
  },
  // `node:tty` no está en workerd; lo pide `debug` (transitivo de express/body-parser) solo
  // para colorear su salida de debug, que nunca se activa en producción.
  tty: {
    match: (a) => a.path === 'tty' || a.path === 'node:tty',
    code: `export function isatty() { return false; }
export default { isatty };
`,
  },
  // `safe(r)-buffer` son shims de `Buffer` para Node viejo; su detección de features hace
  // `require('buffer').hasOwnProperty(...)`, y en workerd ese require devuelve un namespace
  // sin `Object.prototype`. `node:buffer` nativo ya trae el `Buffer` "seguro".
  'safer-buffer': {
    match: (a) => a.path === 'safer-buffer',
    code: `import { Buffer } from 'node:buffer';
export { Buffer };
export const safer = { Buffer };
export const dangerous = { Buffer };
export default { Buffer, safer, dangerous };
`,
  },
  'safe-buffer': {
    match: (a) => a.path === 'safe-buffer',
    code: `import { Buffer } from 'node:buffer';
export { Buffer };
export default { Buffer };
`,
  },
  // Mismo problema que safe(r)-buffer: `require('events')` vía el `require` del banner
  // (createRequire de node:module) devuelve el namespace del módulo en vez de la clase
  // `EventEmitter` en sí (sin `.prototype`), y nunjucks hace `class extends EventEmitter`
  // (`object.js` → `EmitterObj`) al cargar, que revienta con "Object prototype may only be
  // an Object or null: undefined". El `import ... from 'node:events'` ESM nativo sí da la
  // clase real con `.prototype` en workerd.
  events: {
    // OJO: solo el 'events' pelado (lo que pide nunjucks vía `require`) — el stub mismo
    // pide 'node:events' con prefijo, que debe quedar SIN interceptar o el plugin se
    // autorreferenciaría en un ciclo infinito al resolver su propio require.
    //
    // CJS puro a propósito (nada de `import`/`export`): un primer intento con
    // `export default EventEmitter` funcionaba mal — esbuild envuelve ese módulo ESM con
    // `__toCommonJS` al consumirlo desde `require()`, lo que devuelve `{default, EventEmitter}`
    // (un namespace), no la clase en sí — mismo bug original, solo trasladado. El `events`
    // real de Node es CJS puro donde `module.exports` ES la clase (con `.EventEmitter`
    // apuntándose a sí misma) — hay que replicar exactamente esa forma.
    match: (a) => a.path === 'events',
    code: `const mod = require('node:events');
const EventEmitter = mod.default || mod.EventEmitter || mod;
module.exports = EventEmitter;
module.exports.EventEmitter = EventEmitter;
`,
  },
  // `send` = motor de `res.sendFile`/`express.static`. La app en modo `workers` no lo usa
  // (assets por el binding de CF), pero `require('stream')` en workerd no devuelve un
  // constructor y su `util.inherits(SendStream, Stream)` revienta al cargar el módulo.
  send: {
    match: (a) => a.path === 'send',
    code: `export default function send() {
  throw new Error('res.sendFile/express.static no disponible en Workers.');
}
`,
  },
  // workerd (esta versión) no trae `node:fs`. La app en modo `workers` no toca el filesystem
  // (vistas precompiladas, sin `express.static`, APP_VERSION por `define`); express/nunjucks
  // solo lo `require`n a nivel de módulo. Se da un shim que no lee nada.
  fs: {
    match: (a) => a.path === 'fs' || a.path === 'node:fs',
    code: `export const existsSync = () => false;
export const readFileSync = () => { throw new Error('fs.readFileSync no disponible en Workers'); };
export const readdirSync = () => [];
export const statSync = () => { throw new Error('fs.statSync no disponible en Workers'); };
export const realpathSync = (p) => p;
export const createReadStream = () => { throw new Error('fs.createReadStream no disponible en Workers'); };
export default { existsSync, readFileSync, readdirSync, statSync, realpathSync, createReadStream };
`,
  },
  // `nodemailer`: además de `node:os` (hostname/networkInterfaces), su transporte
  // `sendmail-transport` pide `node:child_process` solo con requerirlo — y detrás vendrían
  // `net`/`tls`/`dns` del transporte SMTP real, ninguno disponible en workerd (sin sockets TCP
  // crudos). SMTP no funciona en Workers de todas formas (`container.ts` solo instancia
  // `SmtpEmailSender` si `SMTP_HOST` está seteado, que en prod Workers no lo está — ahí corre
  // `BrevoEmailSender` por HTTP); se stubbea el paquete entero, igual que `config/firebase.js`.
  nodemailer: {
    match: (a) => a.path === 'nodemailer',
    code: `export default {
  createTransport() {
    throw new Error('nodemailer no está disponible en Workers (usar BREVO_API_KEY / BrevoEmailSender).');
  },
};
`,
  },
  // `fast-glob` (vía `awilix/lib/list-modules.js`, que respalda `loadModules`/`listModules`
  // de awilix) pide `node:os`, que no existe en workerd ("No such module"). El proyecto NO
  // usa `loadModules`/`listModules` — `container.ts` registra todo explícito con
  // `asClass`/`asFunction`/`asValue` — así que un stub vacío es seguro.
  'fast-glob': {
    match: (a) => a.path === 'fast-glob',
    code: `export default function fastGlob() {
  throw new Error('fast-glob no está disponible en Workers (awilix.loadModules no se usa).');
}
`,
  },
};

for (const [name, { code }] of Object.entries(stubs)) {
  await writeFile(join(outDir, 'stubs', `${name.replace(/\W+/g, '_')}.js`), code);
}

const stubPlugin = {
  name: 'stub-node-only',
  setup(b) {
    const filtro =
      /(^|\/)(firebase(\.js)?|compression|pino(-http)?|send|(node:)?tty|(node:)?fs|events|safe-buffer|safer-buffer|fast-glob|nodemailer)$/;
    b.onResolve({ filter: filtro }, (args) => {
      for (const [name, { match }] of Object.entries(stubs)) {
        if (match(args)) return { path: join(outDir, 'stubs', `${name.replace(/\W+/g, '_')}.js`) };
      }
      return null;
    });
    // Red de seguridad: si algo MÁS arrastra firebase-admin como valor, que reviente el
    // build (no el deploy). Los `import { type … }` los elide esbuild antes de llegar aquí.
    b.onResolve({ filter: /^firebase-admin(\/|$)/ }, (args) => {
      throw new Error(
        `build-worker: import de valor prohibido "${args.path}" desde ${args.importer}`,
      );
    });
  },
};

// ── 3. Bundle ────────────────────────────────────────────────────────────────
const result = await build({
  stdin: {
    contents:
      "import './worker-dist/views-precompiled.js';\nexport { default } from './src/main.worker.ts';\n",
    resolveDir: root,
    sourcefile: 'worker-entry.mjs',
    loader: 'ts',
  },
  bundle: true,
  format: 'esm',
  // `platform: 'node'` deja los builtins como `require('stream')` CJS (semántica que esperan
  // express/send/iconv-lite); el `require` real lo da el banner desde `node:module`, que
  // `nodejs_compat` soporta. `workerd` no trae `node:tty`/`node:fs` → se stubbean aparte.
  platform: 'node',
  external: ['cloudflare:node'],
  target: 'es2022',
  // Sin el `verbatimModuleSyntax` del tsconfig del proyecto: con él, esbuild NO elide los
  // `import { type Firestore } from 'firebase-admin/firestore'` de los 18 repos y los
  // trataría como imports con efectos → arrastraría firebase-admin al bundle.
  tsconfigRaw: {},
  outfile: join(outDir, 'index.js'),
  define: { 'process.env.APP_VERSION': JSON.stringify(pkg.version) },
  // Deps CJS (express, nunjucks…) hacen `require()` dinámico de módulos ya bundleados. En un
  // bundle ESM esbuild deja un shim que lanza; se le da un `require` real desde `node:module`
  // (lo soporta `nodejs_compat`), que además sirve para los `node:*` marcados external.
  banner: {
    js: [
      "import { createRequire as __cr } from 'node:module';",
      // `import.meta.url` es undefined en workerd; el base path da igual: solo se piden
      // módulos por nombre.
      "const require = __cr('file:///worker.js');",
    ].join('\n'),
  },
  plugins: [stubPlugin],
  logLevel: 'info',
  metafile: true,
});

const bytes = result.metafile.outputs[Object.keys(result.metafile.outputs).find((k) => k.endsWith('index.js'))].bytes;
console.log(`build-worker: bundle ${(bytes / 1024).toFixed(0)} KiB → worker-dist/index.js`);

// ── 4. Assets estáticos (servidos en /static/* por el binding de CF) ──────────
if (existsSync(join(root, 'public'))) {
  await cp(join(root, 'public'), assetsStaticDir, { recursive: true });
  console.log('build-worker: public/ → worker-dist/assets/static/');
}

console.log('build-worker: listo.');
