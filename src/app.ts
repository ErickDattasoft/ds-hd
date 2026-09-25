import { join } from 'node:path';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import express, { type Express } from 'express';
import { pinoHttp } from 'pino-http';
import nunjucks from 'nunjucks';
import type { Container } from './config/container.js';
import type { AppConfig } from './config/env.js';
import { APP_VERSION } from './config/version.js';
import { INFO_APP } from './core/entities/AcercaDe.js';
import { buildRouter } from './interfaces/http/routes/index.js';
import { securityHeaders } from './interfaces/http/middlewares/securityHeaders.js';
import { errorHandler, notFoundHandler } from './interfaces/http/middlewares/errorHandler.js';

/** Carpetas de assets/vistas, resueltas desde la raíz del proceso (igual en dev y en Docker). */
const VIEWS_DIR = join(process.cwd(), 'src', 'views');
const PUBLIC_DIR = join(process.cwd(), 'public');

/**
 * Runtime donde corre la app. `node` (por defecto) = `main.ts` en Docker/local.
 * `workers` = `main.worker.ts` en Cloudflare Workers, que impone:
 * - vistas Nunjucks precompiladas (no hay filesystem para `FileSystemLoader`);
 * - sin `express.static` (los assets de `/static/*` los sirve el binding de CF);
 * - sin `compression` (Cloudflare comprime en el edge);
 * - logs de acceso por `console` (pino usa worker threads, no corren en `workerd`).
 */
export type AppRuntime = 'node' | 'workers';

/** Opciones de `createApp`. Los valores por defecto reproducen el arranque en Node/Docker. */
export interface CreateAppOptions {
  readonly runtime?: AppRuntime;
}

/**
 * Registra Nunjucks como motor de vistas de Express, con los mismos globals y filtros en
 * ambos modos (FileSystemLoader en Node, precompilado en Workers).
 */
function installViewEngine(app: Express, config: AppConfig, precompiled: boolean): void {
  const env = precompiled
    ? new nunjucks.Environment(
        // `@types/nunjucks` tipa mal el constructor (espera `any[]`); en runtime es el
        // mapa `{ "ruta.njk": fn }` que deja `nunjucks.precompile`.
        new nunjucks.PrecompiledLoader(
          ((globalThis as { nunjucksPrecompiled?: unknown }).nunjucksPrecompiled ?? {}) as never,
        ),
        { autoescape: true },
      )
    : new nunjucks.Environment(
        new nunjucks.FileSystemLoader(VIEWS_DIR, { noCache: !config.isProduction }),
        { autoescape: true },
      );
  env.express(app);
  app.set('view engine', 'njk');

  env.addGlobal('APP_VERSION', APP_VERSION);
  env.addFilter('json', (value: unknown) => JSON.stringify(value, null, 2));

  const fmtFecha = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' });
  const fmtFechaHora = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
  // Fecha en palabras ("29 de octubre de 2026") para las páginas públicas, donde el mes
  // abreviado del formato `medium` se lee informal.
  const fmtFechaLarga = new Intl.DateTimeFormat('es-MX', { dateStyle: 'long' });
  const fmtHora = new Intl.DateTimeFormat('es-MX', { timeStyle: 'short' });
  const asDate = (v: unknown): Date | null => {
    // Una fecha ISO sin hora ("2026-10-15") se interpreta como mediodía local para que no
    // "retroceda" un día al formatearse en la zona horaria de México.
    const raw = typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? `${v}T12:00:00` : v;
    const d = raw instanceof Date ? raw : typeof raw === 'string' || typeof raw === 'number' ? new Date(raw) : null;
    return d && !Number.isNaN(d.getTime()) ? d : null;
  };
  env.addFilter('fecha', (v: unknown) => {
    const d = asDate(v);
    return d ? fmtFecha.format(d) : '—';
  });
  env.addFilter('fechahora', (v: unknown) => {
    const d = asDate(v);
    return d ? fmtFechaHora.format(d) : '—';
  });
  env.addFilter('fechalarga', (v: unknown) => {
    const d = asDate(v);
    return d ? fmtFechaLarga.format(d) : '—';
  });
  env.addFilter('hora', (v: unknown) => {
    const d = asDate(v);
    return d ? fmtHora.format(d) : '—';
  });
  env.addFilter('moneda', (v: unknown, moneda = 'MXN') =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: String(moneda) }).format(Number(v) || 0),
  );

  // Clases de color para badges de estado/prioridad (tickets, cotizaciones, eventos). Los
  // catálogos son configurables por texto libre, así que se detecta por palabra clave
  // (normalizada, sin acentos) en vez de comparar contra una lista cerrada de valores.
  const slug = (v: unknown): string =>
    String(v ?? '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .trim()
      .toLowerCase();
  env.addFilter('estadoClase', (v: unknown) => {
    const s = slug(v);
    if (/cerrad/.test(s)) return 'badge';
    if (/cancelad|rechazad|vencid/.test(s)) return 'badge badge--danger';
    if (/resuelt|aceptad|finalizad/.test(s)) return 'badge badge--ok';
    if (/pendient/.test(s)) return 'badge badge--warning';
    if (/proces|enviad|public|abiert/.test(s)) return 'badge badge--info';
    return 'badge badge--estado';
  });
  env.addFilter('prioridadClase', (v: unknown) => {
    const s = slug(v);
    if (s === 'urgente') return 'badge badge--danger badge--pulse';
    if (s === 'alta') return 'badge badge--warning';
    if (s === 'media') return 'badge badge--info';
    return 'badge';
  });
  /** Igual que `estadoClase` pero para la barra de color de una tarjeta `.stat` (resumen). */
  env.addFilter('estadoStatClase', (v: unknown) => {
    const s = slug(v);
    if (/cerrad/.test(s)) return '';
    if (/cancelad|rechazad|vencid/.test(s)) return 'stat--top-danger';
    if (/resuelt|aceptad|finalizad/.test(s)) return 'stat--top-ok';
    if (/pendient/.test(s)) return 'stat--top-warning';
    if (/proces|enviad|public|abiert/.test(s)) return 'stat--top-info';
    return 'stat--top-brand';
  });
}

/**
 * Construye la instancia de Express: motor de vistas, middlewares base y montaje de routers.
 * No abre el puerto — de eso se encargan `main.ts` (Node) y `main.worker.ts` (Workers).
 */
export function createApp(container: Container, options: CreateAppOptions = {}): Express {
  const { config, logger } = container.cradle;
  const runtime: AppRuntime = options.runtime ?? 'node';
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', config.isProduction ? 1 : false);

  installViewEngine(app, config, runtime === 'workers');

  // ── Middlewares base ────────────────────────────────────────────────────────
  if (runtime === 'workers') {
    app.use((req, res, next) => {
      if (req.url !== '/healthz') {
        const inicio = Date.now();
        res.on('finish', () =>
          logger.info('request', {
            method: req.method,
            url: req.url,
            status: res.statusCode,
            ms: Date.now() - inicio,
          }),
        );
      }
      next();
    });
  } else {
    app.use(
      pinoHttp({
        level: config.logLevel,
        ...(config.isProduction || config.isTest
          ? {}
          : { transport: { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss' } } }),
        autoLogging: { ignore: (req) => req.url === '/healthz' },
      }),
    );
  }
  app.use(securityHeaders(config));
  if (runtime === 'node') app.use(compression());
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));
  // 15mb: el backup completo (empresas/contactos/tickets/KB/...) se restaura como JSON en
  // el body — hoy pesa ~1.4mb y crece con el tiempo; el resto de rutas usa payloads chicos.
  app.use(express.json({ limit: '15mb' }));
  app.use(cookieParser(config.session.secret));
  if (runtime === 'node') {
    app.use(
      '/static',
      express.static(PUBLIC_DIR, { maxAge: config.isProduction ? '7d' : 0, index: false }),
    );
  }

  // Locals disponibles en todas las vistas.
  app.use((req, res, next) => {
    res.locals.config = { baseUrl: config.baseUrl, env: config.env };
    res.locals.appNombre = INFO_APP.nombre;
    res.locals.currentPath = req.path;
    res.locals.can = (permiso: string): boolean => req.user?.permisos.includes(permiso) ?? false;
    const tema = req.cookies?.theme;
    if (tema === 'light' || tema === 'dark') res.locals.theme = tema;
    res.locals.sidebarMini = req.cookies?.sidebar === 'mini';
    next();
  });

  // ── Routers ────────────────────────────────────────────────────────────────
  app.use(buildRouter(container));

  // ── Cierre de la cadena ────────────────────────────────────────────────────
  app.use(notFoundHandler);
  app.use(errorHandler(logger));

  return app;
}
