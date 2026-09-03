// Carga worker-dist/index.js en Node (con un stub de `cloudflare:node`) y le pega HTTP real.
// `app.listen(8080)` del bundle abre un socket TCP de verdad en Node, así que se puede curlear.
// Verifica que el bundle de Workers sirve HTML (vistas precompiladas) y estáticos ausentes → 404.
//
// Requiere el emulador Docker arriba. Uso:
//   FIREBASE_PROJECT_ID=ds-hd-local FIRESTORE_DRIVER=rest NODE_ENV=production \
//   FIRESTORE_EMULATOR_HOST=localhost:8080 FIREBASE_AUTH_EMULATOR_HOST=localhost:9099 \
//   SESSION_COOKIE_SECRET=smoke-secret-1234567890 \
//   node scripts/dev/worker-bundle-smoke.mjs
import module from 'node:module';

module.register(
  'data:text/javascript,' +
    encodeURIComponent(
      'export async function resolve(s,c,d){if(s==="cloudflare:node")return{url:"data:text/javascript,export function httpServerHandler(){return{}}",shortCircuit:true};return d(s,c);}',
    ),
);

await import('../../worker-dist/index.js');
await new Promise((r) => setTimeout(r, 400));

const base = 'http://127.0.0.1:8787';
let fallos = 0;
async function check(path, pred, desc) {
  const res = await fetch(base + path, { redirect: 'manual' });
  const body = await res.text();
  const ok = pred(res, body);
  console.log(`  ${ok ? '✓' : '✗'} ${path} → ${res.status} · ${desc}`);
  if (!ok) fallos++;
}

await check('/healthz', (r) => r.status === 200, 'healthcheck');
await check('/login', (r, b) => r.status === 200 && b.includes('<!doctype html>'), 'render de vista precompilada');
await check('/app', (r) => r.status === 302 && (r.headers.get('location') ?? '').includes('/login'), 'guard de auth redirige');
await check('/ticket-publico', (r, b) => r.status === 200 && b.includes('</form>'), 'form público (vista con include de partials)');
await check('/static/build/tokens.css', (r) => r.status === 404, 'estáticos NO los sirve el Worker (los sirve el binding de CF)');

console.log(fallos === 0 ? '\nWorker bundle: HTTP OK ✅' : `\n${fallos} fallo(s) ❌`);
process.exit(fallos === 0 ? 0 : 1);
