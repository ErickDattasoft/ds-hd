import 'dotenv/config';
/**
 * Verifica la migración en el proyecto NUEVO: conteos e integridad referencial básica
 * (todo ticket con empresaId apunta a una empresa que existe, etc.).
 *
 *   tsx scripts/migrate/99-verify-migration.ts
 */
import { nuevoProyecto } from './lib.js';

const c = nuevoProyecto();
const empresas = await c.resolve('empresaRepo').list();
const contactos = await c.resolve('contactoRepo').list();
const tickets = await c.resolve('ticketQueries').listar({ soloAbiertos: false });
const cotizaciones = await c.resolve('cotizacionRepo').list();
const usuarios = await c.resolve('usuarioRepo').list();

const idsEmpresa = new Set(empresas.map((e) => e.id));
const problemas: string[] = [];

for (const con of contactos) {
  if (con.empresaId && !idsEmpresa.has(con.empresaId)) {
    problemas.push(`Contacto ${con.id} apunta a empresa inexistente ${con.empresaId}`);
  }
}
for (const t of tickets) {
  if (t.empresaId && !idsEmpresa.has(t.empresaId)) {
    problemas.push(`Ticket #${t.numero} apunta a empresa inexistente ${t.empresaId}`);
  }
}
for (const cot of cotizaciones) {
  if (cot.empresaId && !idsEmpresa.has(cot.empresaId)) {
    problemas.push(`Cotización ${cot.folio} apunta a empresa inexistente ${cot.empresaId}`);
  }
}

console.log('── Conteos ──────────────────────────');
console.table({
  empresas: empresas.length,
  contactos: contactos.length,
  tickets: tickets.length,
  cotizaciones: cotizaciones.length,
  usuarios: usuarios.length,
});

if (problemas.length === 0) {
  console.log('✅ Integridad referencial OK');
  process.exit(0);
}
console.log(`⚠️  ${problemas.length} problemas de integridad:`);
for (const p of problemas.slice(0, 50)) console.log('  -', p);
process.exit(1);
