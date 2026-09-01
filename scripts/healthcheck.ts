/**
 * Healthcheck para el HEALTHCHECK de Docker. Sale con 0 si /healthz responde 200.
 * Se ejecuta como `node dist/scripts/healthcheck.js`.
 */
const port = process.env.PORT ?? '3000';
const url = `http://127.0.0.1:${port}/healthz`;

try {
  const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
  if (res.status === 200) {
    process.exit(0);
  }
  console.error(`healthcheck: ${url} devolvió ${res.status}`);
  process.exit(1);
} catch (err) {
  console.error(`healthcheck: sin respuesta de ${url}:`, err instanceof Error ? err.message : err);
  process.exit(1);
}
