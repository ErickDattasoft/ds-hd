import 'dotenv/config';
/**
 * Orquestador de la migración. Lee el respaldo real (botón "Respaldar" del CRM viejo) y corre
 * todos los importadores contra el proyecto Firebase NUEVO.
 *
 *   tsx scripts/migrate/run-all.ts --dry-run --input=/ruta/al/respaldo.json
 *   tsx scripts/migrate/run-all.ts --input=/ruta/al/respaldo.json   # ejecuta la migración
 *
 * Los usuarios NO se crean aquí (requiere una cuenta real de Firebase Auth) — dalos de alta
 * por invitación desde /app/usuarios; `importarUsuarios` solo reporta cuáles faltan.
 * Ver README.md para los pasos restantes: `99-verify-migration.ts`.
 */
import { DRY_RUN, leerExport, log, nuevoProyecto } from './lib.js';
import {
  importarEmpresas,
  importarContactos,
  importarTickets,
  importarVersiones,
  importarKB,
  importarBitacora,
  importarConfiguracionTickets,
  importarConfiguracionAvisos,
  importarAcercaDe,
  importarUsuarios,
  importarAdjuntos,
} from './importers.js';

const datos = leerExport();
const c = nuevoProyecto();

log('run-all', DRY_RUN ? 'DRY-RUN (no se escribe nada)' : 'MIGRACIÓN REAL');

await importarUsuarios(c, datos);
await importarEmpresas(c, datos);
const contactos = await importarContactos(c, datos);
await importarVersiones(c, datos);
await importarKB(c, datos);
await importarBitacora(c, datos);
await importarConfiguracionTickets(c, datos);
await importarConfiguracionAvisos(c, datos);
await importarAcercaDe(c, datos);
await importarTickets(c, datos);
await importarAdjuntos(c, datos); // requiere CRM_VIEJO_SA_JSON; si no, se omite

if (contactos.sinEmpresa.length) {
  log('run-all', `contactos sin empresa emparejada (revisar en "Sin empresa (revisar tras migración)"):`);
  for (const linea of contactos.sinEmpresa) log('run-all', `  - ${linea}`);
}

log('run-all', 'terminado. Ejecuta 99-verify-migration.ts para validar.');
process.exit(0);
