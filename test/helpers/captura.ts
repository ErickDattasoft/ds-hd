import type { Server } from 'node:http';
import puppeteer, { type Page } from 'puppeteer';
import { makeTestApp } from './app.js';

/** Usuario admin para capturas del CRM (`/app/...`). */
export const ADMIN_CAPTURA = {
  uid: 'u-captura',
  email: 'admin@dattasoft.mx',
  password: 'admin12345',
  nombre: 'Erick Admin',
  rol: 'admin' as const,
};

/** Tamaños de pantalla de las capturas. */
export const VISTAS = {
  celular: { width: 390, height: 844, deviceScaleFactor: 2 },
  escritorio: { width: 1440, height: 900, deviceScaleFactor: 1 },
} as const;

export interface OpcionesCaptura {
  /** Rutas a capturar, p. ej. `['/eventos/ev1', '/app/eventos/ev1']`. */
  rutas: string[];
  /** Carpeta donde se guardan los .png (usar el scratchpad de la sesión). */
  carpeta: string;
  /** Qué vistas sacar (por defecto celular y escritorio). */
  vistas?: Array<keyof typeof VISTAS>;
  /** Qué temas sacar (por defecto claro y oscuro). */
  temas?: Array<'claro' | 'oscuro'>;
  /** Página completa (alto total) en vez de solo lo visible. */
  completa?: boolean;
  /** Llena los repos en memoria antes de capturar (eventos, tickets, empresas…). */
  sembrar?: (t: ReturnType<typeof makeTestApp>) => void | Promise<void>;
  /** Algo que hacer en la página antes de la foto (clic, abrir un desplegable…). */
  antes?: (page: Page, ruta: string) => Promise<void>;
}

/**
 * Levanta la app de prueba (repos en memoria, sin Firebase), inicia sesión como admin si alguna
 * ruta es del CRM y saca una captura por ruta × vista × tema. Devuelve las rutas de los .png.
 * Se usa desde un test temporal (`test/zz-captura.test.ts`), que ya trae las variables de entorno
 * de prueba de `vitest.config.ts`.
 */
export async function capturar(op: OpcionesCaptura): Promise<string[]> {
  const t = makeTestApp({ usuarios: [ADMIN_CAPTURA] });
  await op.sembrar?.(t);
  const srv: Server = t.app.listen(0);
  const port = (srv.address() as { port: number }).port;
  const base = `http://localhost:${port}`;
  const navegador = await puppeteer.launch({ args: ['--no-sandbox'] });
  const archivos: string[] = [];
  try {
    const page = await navegador.newPage();
    if (op.rutas.some((r) => r.startsWith('/app'))) {
      await page.goto(`${base}/login`, { waitUntil: 'networkidle0' });
      await page.type('input[name="email"]', ADMIN_CAPTURA.email);
      await page.type('input[name="password"]', ADMIN_CAPTURA.password);
      await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), page.click('button[type="submit"]')]);
    }
    for (const tema of op.temas ?? ['claro', 'oscuro']) {
      await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: tema === 'oscuro' ? 'dark' : 'light' }]);
      for (const vista of op.vistas ?? ['celular', 'escritorio']) {
        await page.setViewport(VISTAS[vista]);
        for (const ruta of op.rutas) {
          await page.goto(base + ruta, { waitUntil: 'networkidle0' });
          await op.antes?.(page, ruta);
          const nombre = `${ruta.replace(/^\//, '').replace(/[^a-z0-9]+/gi, '_') || 'inicio'}-${vista}-${tema}.png`;
          const archivo = `${op.carpeta.replace(/\/$/, '')}/${nombre}`;
          await page.screenshot({ path: archivo as `${string}.png`, fullPage: op.completa ?? false });
          archivos.push(archivo);
        }
      }
    }
  } finally {
    await navegador.close();
    srv.close();
  }
  return archivos;
}
