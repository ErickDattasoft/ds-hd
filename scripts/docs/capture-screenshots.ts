/**
 * Recorre la app dockerizada (o cualquier instancia ya arrancada) con Playwright, inicia
 * sesión con cada rol de `flows.ts` y guarda una captura por paso en
 * `docs/manual/screenshots/`. `generate-manuals.ts` las referencia si existen; su ausencia
 * no rompe la generación (los manuales sin capturas siguen siendo válidos).
 *
 * Requiere:
 *   - La app corriendo y accesible en BASE_URL (por defecto http://localhost:3000).
 *   - `npm run seed:roles` y `npm run seed:demo` ya ejecutados contra ese entorno.
 *   - Navegador de Playwright instalado: `npx playwright-core install chromium`.
 *
 * Uso: npm run docs:screenshots
 */
import { chromium, type Page } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { FLOWS, FLUJO_PUBLICO } from './flows.js';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const OUT_DIR = join(process.cwd(), 'docs/manual/screenshots');
mkdirSync(OUT_DIR, { recursive: true });

async function main() {
  const browser = await chromium.launch({ headless: true });
  let capturadas = 0;

  try {
    // Flujo público: sin sesión.
    {
      const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
      for (const paso of FLUJO_PUBLICO) {
        capturadas += await capturar(page, paso.modulo, paso.paso, paso.ruta, paso.esperarSelector);
      }
      await page.close();
    }

    for (const flujo of FLOWS) {
      const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
      const entroSesion = await login(page, flujo.email, flujo.password);
      if (!entroSesion) {
        console.warn(
          `No se pudo iniciar sesión como ${flujo.email} (rol ${flujo.rol}); se omite su recorrido.`,
        );
        await page.close();
        continue;
      }
      for (const paso of flujo.pasos) {
        capturadas += await capturar(page, paso.modulo, paso.paso, paso.ruta, paso.esperarSelector);
      }
      await page.close();
    }
  } finally {
    await browser.close();
  }

  console.log(`Listo: ${capturadas} capturas en ${OUT_DIR}`);
}

async function login(page: Page, email: string, password: string): Promise<boolean> {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await Promise.all([page.waitForLoadState('networkidle'), page.click('button[type="submit"]')]);
  return !page.url().includes('/login');
}

async function capturar(
  page: Page,
  modulo: string,
  paso: string,
  ruta: string,
  esperarSelector?: string,
): Promise<number> {
  try {
    await page.goto(`${BASE_URL}${ruta}`, { waitUntil: 'networkidle' });
    if (esperarSelector) await page.waitForSelector(esperarSelector, { timeout: 5000 });
    const archivo = join(OUT_DIR, `${modulo}-${paso}.png`);
    await page.screenshot({ path: archivo, fullPage: true });
    console.log(`✓ ${modulo}-${paso} ← ${ruta}`);
    return 1;
  } catch (err) {
    console.warn(`✗ ${modulo}-${paso} (${ruta}): ${(err as Error).message}`);
    return 0;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
