// Carga variables de un archivo .env si existe (dev/local). En Docker/producción las
// variables vienen del entorno y dotenv no las sobrescribe: es un no-op inofensivo.
import 'dotenv/config';
import { createApp } from './app.js';
import { buildContainer } from './config/container.js';
import { loadConfig } from './config/env.js';
import { APP_VERSION } from './config/version.js';

/** Punto de entrada: carga config → arma el contenedor → crea la app → abre el puerto. */
async function main(): Promise<void> {
  const config = loadConfig();
  const container = buildContainer(config);
  const { logger } = container.cradle;
  const app = createApp(container);

  const server = app.listen(config.port, () => {
    logger.info('ds-hd escuchando', {
      version: APP_VERSION,
      port: config.port,
      env: config.env,
      url: config.baseUrl,
    });
  });

  const shutdown = (signal: string): void => {
    logger.info(`Señal ${signal} recibida, cerrando…`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('Fallo al arrancar ds-hd:', err);
  process.exit(1);
});
