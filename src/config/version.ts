import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Versión de la app, leída de package.json (en la raíz del proceso) al arrancar. */
function readVersion(): string {
  if (process.env.APP_VERSION) return process.env.APP_VERSION;
  try {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as {
      version?: string;
    };
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

export const APP_VERSION = readVersion();
