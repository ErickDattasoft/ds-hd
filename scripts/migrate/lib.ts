/**
 * Utilidades compartidas por los scripts de migración desde el CRM viejo al modelo por
 * colecciones nuevo. El respaldo real de la app (botón "Respaldar", no `agenda/datos` crudo)
 * tiene la forma `{version, app, fecha, datos: {clientes, contactos, tickets, ...}}`.
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

/** Lee el respaldo real de la app y devuelve su sección `datos` (aplana el wrapper). */
export function leerExport(): Record<string, unknown> {
  try {
    const raw = JSON.parse(readFileSync(EXPORT_PATH, 'utf8')) as Record<string, unknown>;
    return (raw.datos as Record<string, unknown>) ?? raw;
  } catch (err) {
    throw new Error(
      `No se pudo leer el respaldo en ${EXPORT_PATH}. Pásalo con --input=<ruta al JSON>. ` +
        `(${err instanceof Error ? err.message : err})`,
    );
  }
}

export { arr, slug, hashId } from '../../src/application/migracion/lib.js';

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
