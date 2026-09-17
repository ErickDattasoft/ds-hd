import 'dotenv/config';
/**
 * PELIGROSO — borra TODO el dato de negocio (empresas, contactos, tickets, cotizaciones,
 * eventos, KB, bitácora, versiones) y después corre la carga normal del respaldo
 * (`importers.ts`) para dejar la base exactamente como dice el archivo nuevo. Pensado para
 * "recargar de cero" cuando la base quedó con basura de pruebas mezclada con datos reales
 * (ver [[ds-hd-migracion-respaldos]] en memoria) — NO para uso rutinario.
 *
 * NUNCA toca usuarios, roles ni permisos (necesitas seguir pudiendo entrar). La configuración
 * del sistema (catálogos de tickets, avisos, "Acerca de") tampoco se borra aparte — la carga
 * normal ya la sobreescribe completa.
 *
 * OJO: cotizaciones y eventos se borran pero NO se recargan (el respaldo del CRM viejo nunca
 * trajo datos reales de esos módulos, así que no hay importador). Si creaste cotizaciones o
 * eventos directo en ds-hd después de la migración, este script los borra sin poder
 * recuperarlos — pensado solo para mientras el CRM viejo sigue siendo la fuente de verdad.
 *
 * Por defecto es dry-run (solo cuenta qué borraría). Pasa --confirm para borrar y recargar de
 * verdad.
 *
 * Uso:
 *   DOTENV_CONFIG_PATH=.env.real npx tsx scripts/migrate/reset-and-import.ts --input=/ruta.json
 *   DOTENV_CONFIG_PATH=.env.real npx tsx scripts/migrate/reset-and-import.ts --input=/ruta.json --confirm
 */
import { leerExport, nuevoProyecto } from './lib.js';
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
} from './importers.js';

const confirmar = process.argv.includes('--confirm');
const c = nuevoProyecto();
const db = c.resolve('firestoreDb');
if (!db) throw new Error('Firestore no disponible (DISABLE_FIREBASE=true) — nada que hacer.');

const empresaRepo = c.resolve('empresaRepo');
const contactoRepo = c.resolve('contactoRepo');
const ticketRepo = c.resolve('ticketRepo');
const ticketQueries = c.resolve('ticketQueries');
const cotizacionRepo = c.resolve('cotizacionRepo');
const eventoRepo = c.resolve('eventoRepo');
const inscripcionRepo = c.resolve('inscripcionRepo');
const knowledgeRepo = c.resolve('knowledgeRepo');
const versionRepo = c.resolve('versionRepo');
const bitacoraRepo = c.resolve('bitacoraRepo');

const empresas = await empresaRepo.list();
const contactos = await contactoRepo.list();
const tickets = [...(await ticketQueries.listar({})), ...(await ticketQueries.listar({ archivado: true }))];
const cotizaciones = await cotizacionRepo.list();
const eventos = await eventoRepo.list();
const articulos = await knowledgeRepo.list();
const versiones = await versionRepo.list();
const bitacora = await bitacoraRepo.listar({});

console.log('Se borraría:');
console.log(`  ${empresas.length} empresas, ${contactos.length} contactos`);
console.log(`  ${tickets.length} tickets (con sus notas/eventos)`);
console.log(`  ${cotizaciones.length} cotizaciones (SIN recarga posterior)`);
console.log(`  ${eventos.length} eventos con sus inscripciones (SIN recarga posterior)`);
console.log(`  ${articulos.length} artículos de KB`);
console.log(`  ${versiones.length} versiones de sistemas`);
console.log(`  ${bitacora.length} entradas de bitácora`);

if (!confirmar) {
  console.log('\nDry-run: no se borró nada. Pasa --confirm para borrar y recargar de verdad.');
  process.exit(0);
}

console.log('\nBorrando...');
for (const t of tickets) await ticketRepo.eliminar(t.id);
for (const ct of contactos) await contactoRepo.eliminar(ct.id);
for (const e of empresas) await empresaRepo.eliminar(e.id);
for (const cz of cotizaciones) await db.collection('cotizaciones').doc(cz.id).delete();
for (const ev of eventos) {
  await inscripcionRepo.eliminarPorEvento(ev.id);
  await eventoRepo.eliminar(ev.id);
}
for (const a of articulos) await knowledgeRepo.eliminar(a.id);
for (const v of versiones) await versionRepo.eliminar(v.id);
let hayMas = true;
while (hayMas) {
  const r = await bitacoraRepo.purgar(new Date(), 500);
  hayMas = r.hayMas;
}
console.log('Todo borrado. Cargando el respaldo nuevo...');

const datos = leerExport();
await importarEmpresas(c, datos);
const contactosResultado = await importarContactos(c, datos);
await importarVersiones(c, datos);
await importarKB(c, datos);
await importarBitacora(c, datos);
await importarConfiguracionTickets(c, datos);
await importarConfiguracionAvisos(c, datos);
await importarAcercaDe(c, datos);
await importarTickets(c, datos);

if (contactosResultado.sinEmpresa.length) {
  console.log('Contactos sin empresa emparejada (revisar en "Sin empresa (revisar tras migración)"):');
  for (const linea of contactosResultado.sinEmpresa) console.log(`  - ${linea}`);
}

console.log('\nListo — base recargada desde el respaldo. Corre 99-verify-migration.ts para validar.');
process.exit(0);
