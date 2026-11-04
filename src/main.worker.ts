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
import { conLecturas } from './infrastructure/firestore-rest/lecturas.js';

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

const http = httpServerHandler({ port: PORT });

/**
 * Jobs que antes corrían solo desde el cron de GitHub (que en la práctica se atrasa 5-6 h).
 * Cada cron de Cloudflare es una invocación aparte, con su propio presupuesto de
 * subpeticiones, así que se reparten en grupos chicos.
 */
const JOBS_POR_CRON: Record<string, string[]> = {
  '7 * * * *': ['recordatorios-eventos', 'seguimiento-eventos'],
  '27 * * * *': ['recalcular-sla', 'resumen-diario'],
  '47 * * * *': ['completar-empresa-tickets', 'purgar-bitacora', 'backup-pendiente', 'revisar-versiones-contpaqi'],
};

export default {
  fetch: (request: Request, env: unknown, ctx: unknown) => http.fetch(request, env, ctx),
  /**
   * Cron Triggers de Cloudflare (`triggers.crons` en wrangler.jsonc). Cada 5 min: buzón de Zoho
   * (respuestas con imágenes, que CloudMailin gratis rechaza por tamaño). Cada hora: los jobs de
   * {@link JOBS_POR_CRON}, llamados por dentro (sin salir a internet) con el JOBS_SECRET.
   */
  async scheduled(evento: { cron?: string }, env: unknown, ctx: { waitUntil(p: Promise<unknown>): void }): Promise<void> {
    const { correoEntranteService, logger } = container.cradle;
    const jobs = evento?.cron ? JOBS_POR_CRON[evento.cron] : undefined;
    if (jobs) {
      ctx.waitUntil(
        (async () => {
          for (const job of jobs) {
            try {
              const r = await http.fetch(
                new Request(`https://ds-hd.interno/jobs/${job}`, {
                  method: 'POST',
                  headers: { authorization: `Bearer ${config.jobs.secret}` },
                }),
                env,
                ctx,
              );
              const cuerpo = (await r.text()).slice(0, 300);
              if (r.ok) logger.info(`cron ${job}`, { status: r.status, cuerpo });
              else logger.warn(`cron ${job} falló`, { status: r.status, cuerpo });
            } catch (err) {
              logger.warn(`cron ${job} falló`, { err: err instanceof Error ? err.message : String(err) });
            }
          }
        })(),
      );
      return;
    }
    const { resultado, lecturas } = conLecturas(() => correoEntranteService.revisar());
    ctx.waitUntil(
      resultado
        .catch((err: unknown) => {
          logger.warn('Revisión de Zoho (cron) falló', { err: err instanceof Error ? err.message : String(err) });
        })
        .finally(() => logger.info('cron Zoho', { lecturas: lecturas() })),
    );
  },
};
