/**
 * Punto de entrada para Cloudflare Workers (paralelo a `main.ts`, que es el de Node/Docker).
 *
 * Diferencias con `main.ts`:
 * - No hay `dotenv` ni señales de proceso: la config llega por `process.env` que Cloudflare
 *   puebla desde los `vars`/secrets del Worker (con `nodejs_compat`).
 * - Vistas Nunjucks precompiladas y assets servidos por el binding de CF — ver `createApp`.
 * - `FIRESTORE_DRIVER=rest` es obligatorio: `firebase-admin`/gRPC no corre en Workers
 *   (el bundle de `build-worker` además sustituye `config/firebase.ts` por un stub).
 *
 * El `port` de `app.listen`/`httpServerHandler` es solo una clave de enrutado interna.
 */
import { httpServerHandler } from 'cloudflare:node';
import { createApp } from './app.js';
import { buildContainer } from './config/container.js';
import { loadConfig } from './config/env.js';
import { APP_VERSION } from './config/version.js';
import { ConsoleLogger } from './infrastructure/system/ConsoleLogger.js';

const PORT = 8787;

const config = loadConfig();
if (config.firebase.driver !== 'rest') {
  throw new Error('main.worker.ts requiere FIRESTORE_DRIVER=rest (firebase-admin no corre en Workers).');
}

const container = buildContainer(config, { logger: ConsoleLogger.create({ level: config.logLevel }) });
const app = createApp(container, { runtime: 'workers' });

app.listen(PORT, () => {
  container.cradle.logger.info('ds-hd (worker) listo', {
    version: APP_VERSION,
    env: config.env,
    projectId: config.firebase.projectId,
  });
});

export default httpServerHandler({ port: PORT });
