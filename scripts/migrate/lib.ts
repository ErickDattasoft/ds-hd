/**
 * Utilidades compartidas por los scripts de migración desde el CRM viejo (documento
 * monolítico `agenda/datos` del proyecto Firebase original) al modelo por colecciones nuevo.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildContainer, type Container } from '../../src/config/container.js';
import { loadConfig } from '../../src/config/env.js';

export const DRY_RUN = process.argv.includes('--dry-run');
export const EXPORT_PATH =
  process.argv.find((a) => a.startsWith('--input='))?.slice('--input='.length) ??
  join(process.cwd(), 'scratchpad', 'agenda-datos.json');

/** Contenedor apuntando al proyecto Firebase NUEVO (destino de la migración). */
export function nuevoProyecto(): Container {
  return buildContainer(loadConfig());
}

/** Lee el volcado de `agenda/datos` producido por 00-export-agenda-datos.ts. */
export function leerExport(): Record<string, unknown> {
  try {
    return JSON.parse(readFileSync(EXPORT_PATH, 'utf8')) as Record<string, unknown>;
  } catch (err) {
    throw new Error(
      `No se pudo leer el export en ${EXPORT_PATH}. Ejecuta primero 00-export-agenda-datos.ts ` +
        `o pásalo con --input=<ruta>. (${err instanceof Error ? err.message : err})`,
    );
  }
}

export const arr = (v: unknown): Record<string, unknown>[] =>
  Array.isArray(v) ? (v as Record<string, unknown>[]) : [];

export function log(paso: string, msg: string): void {
  console.log(`[${DRY_RUN ? 'DRY ' : 'MIGR'}] ${paso}: ${msg}`);
}

/** Fecha desde varios formatos posibles del CRM viejo. */
export function fechaDe(v: unknown): Date {
  if (typeof v === 'number') return new Date(v);
  if (typeof v === 'string') {
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return d;
  }
  if (v && typeof v === 'object' && 'seconds' in (v as Record<string, unknown>)) {
    return new Date(Number((v as { seconds: number }).seconds) * 1000);
  }
  return new Date();
}
