import { join } from 'node:path';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import express, { type Express } from 'express';
import { pinoHttp } from 'pino-http';
import nunjucks from 'nunjucks';
import type { Container } from './config/container.js';
import { APP_VERSION } from './config/version.js';
import { buildRouter } from './interfaces/http/routes/index.js';
import { securityHeaders } from './interfaces/http/middlewares/securityHeaders.js';
import { errorHandler, notFoundHandler } from './interfaces/http/middlewares/errorHandler.js';

/** Carpetas de assets/vistas, resueltas desde la raíz del proceso (igual en dev y en Docker). */
const VIEWS_DIR = join(process.cwd(), 'src', 'views');
const PUBLIC_DIR = join(process.cwd(), 'public');

/**
 * Construye la instancia de Express: motor de vistas, middlewares base y montaje de routers.
 * No abre el puerto — de eso se encarga `main.ts`.
 */
export function createApp(container: Container): Express {
  const { config, logger } = container.cradle;
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', config.isProduction ? 1 : false);

  // ── Motor de vistas (Nunjucks) ──────────────────────────────────────────────
  const njk = nunjucks.configure(VIEWS_DIR, {
    autoescape: true,
    noCache: !config.isProduction,
    express: app,
  });
  njk.addGlobal('APP_VERSION', APP_VERSION);
  njk.addFilter('json', (value: unknown) => JSON.stringify(value, null, 2));
  app.set('view engine', 'njk');

  // ── Middlewares base ────────────────────────────────────────────────────────
  app.use(
    pinoHttp({
      level: config.logLevel,
      ...(config.isProduction || config.isTest
        ? {}
        : { transport: { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss' } } }),
      autoLogging: { ignore: (req) => req.url === '/healthz' },
    }),
  );
  app.use(securityHeaders(config));
  app.use(compression());
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser(config.session.secret));
  app.use(
    '/static',
    express.static(PUBLIC_DIR, { maxAge: config.isProduction ? '7d' : 0, index: false }),
  );

  // Locals disponibles en todas las vistas.
  app.use((_req, res, next) => {
    res.locals.config = { baseUrl: config.baseUrl, env: config.env };
    next();
  });

  // ── Routers ────────────────────────────────────────────────────────────────
  app.use(buildRouter(container));

  // ── Cierre de la cadena ────────────────────────────────────────────────────
  app.use(notFoundHandler);
  app.use(errorHandler(logger));

  return app;
}
