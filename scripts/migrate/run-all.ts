import 'dotenv/config';
/**
 * Orquestador de la migración. Lee el export (`00-export-agenda-datos.ts`) y corre todos los
 * importadores contra el proyecto Firebase NUEVO.
 *
 *   tsx scripts/migrate/run-all.ts --dry-run          # sin escribir, solo conteos
 *   tsx scripts/migrate/run-all.ts                    # ejecuta la migración
 *   tsx scripts/migrate/run-all.ts --input=/ruta.json
 *
 * Pasos 09 (usuarios de Firebase Auth) y 10 (Storage) van aparte, con la CLI de Firebase:
 *   firebase auth:export usuarios.json --project VIEJO
 *   firebase auth:import usuarios.json --project NUEVO --hash-algo=... (parámetros del proyecto viejo)
 *   gsutil -m rsync -r gs://BUCKET_VIEJO gs://BUCKET_NUEVO
 */
import { DRY_RUN, leerExport, log, nuevoProyecto } from './lib.js';
import {
  importarEmpresas,
  importarContactos,
  importarTickets,
  importarCotizaciones,
  importarVersiones,
  importarKB,
  importarUsuarios,
} from './importers.js';

const datos = leerExport();
const c = nuevoProyecto();

log('run-all', DRY_RUN ? 'DRY-RUN (no se escribe nada)' : 'MIGRACIÓN REAL');

await importarUsuarios(c, datos);
await importarEmpresas(c, datos);
await importarContactos(c, datos);
await importarVersiones(c, datos);
await importarKB(c, datos);
await importarCotizaciones(c, datos);
await importarTickets(c, datos);

log('run-all', 'terminado. Ejecuta 99-verify-migration.ts para validar.');
process.exit(0);
