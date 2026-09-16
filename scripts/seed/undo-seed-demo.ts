import 'dotenv/config';
/**
 * Deshace `seed-demo.ts`: borra los datos ficticios que ese script crea (empresa demo,
 * contacto demo, cuentas de staff/cliente ficticias, tickets de ejemplo) cuando terminaron
 * corriendo contra producción por error, antes de la migración real de datos.
 *
 * Por seguridad, por defecto NO borra nada — solo lista lo que encontró (dry-run). Pasa
 * --confirm para borrar de verdad.
 *
 * Uso:
 *   DOTENV_CONFIG_PATH=.env.real npx tsx scripts/seed/undo-seed-demo.ts             # dry-run
 *   DOTENV_CONFIG_PATH=.env.real npx tsx scripts/seed/undo-seed-demo.ts --confirm   # borra
 */
import { buildContainer } from '../../src/config/container.js';
import { loadConfig } from '../../src/config/env.js';

const confirmar = process.argv.includes('--confirm');

const EMPRESA_DEMO = 'Comercializadora Demo SA de CV';
const EMAIL_CLIENTE = 'cliente@dattasoft.mx';
const CORREOS_STAFF_DEMO = [
  'ana@dattasoft.mx',
  'beto@dattasoft.mx',
  'soporte@dattasoft.mx',
  'ventas@dattasoft.mx',
];
const ASUNTOS_DEMO = new Set(['No abre Contabilidad', 'Error al timbrar nómina', 'Duda sobre respaldo']);

const c = buildContainer(loadConfig());
const firebase = c.resolve('firebase');
if (!firebase) throw new Error('Firebase deshabilitado (DISABLE_FIREBASE=true) — nada que limpiar.');
const auth = firebase.auth;
const usuarios = c.resolve('usuarioRepo');
const empresaRepo = c.resolve('empresaRepo');
const contactoRepo = c.resolve('contactoRepo');
const ticketRepo = c.resolve('ticketRepo');
const authProvider = c.resolve('authProvider');

// ── Tickets de ejemplo: folios 1-6, verificando el asunto por seguridad ────────────────
const tickets = (
  await Promise.all([1, 2, 3, 4, 5, 6].map((n) => ticketRepo.findByNumero(n)))
).filter((t) => t !== null && ASUNTOS_DEMO.has(t.asunto));

// ── Empresa demo ────────────────────────────────────────────────────────────────────
const empresas = await empresaRepo.list();
const empresaDemo = empresas.find((e) => e.nombre === EMPRESA_DEMO) ?? null;

// ── Contacto demo ───────────────────────────────────────────────────────────────────
const contactoDemo = await contactoRepo.findByEmail(EMAIL_CLIENTE);

// ── Cuentas ficticias (staff + cliente) ─────────────────────────────────────────────
const correos = [...CORREOS_STAFF_DEMO, EMAIL_CLIENTE];
const cuentas = (
  await Promise.all(
    correos.map(async (email) => {
      const usuario = await usuarios.findByEmail(email);
      const uid = usuario?.uid ?? (await authProvider.getUidByEmail(email));
      return { email, usuario, uid };
    }),
  )
).filter((c) => c.usuario || c.uid);

console.log(`Tickets de ejemplo encontrados: ${tickets.length}`);
tickets.forEach((t) => console.log(`  #${t!.numero} "${t!.asunto}" (${t!.id})`));
console.log(`Empresa demo: ${empresaDemo ? `${empresaDemo.nombre} (${empresaDemo.id})` : 'no encontrada'}`);
console.log(`Contacto demo: ${contactoDemo ? `${contactoDemo.nombre} (${contactoDemo.id})` : 'no encontrado'}`);
console.log(`Cuentas ficticias encontradas: ${cuentas.length}`);
cuentas.forEach((c) => console.log(`  ${c.email} (uid=${c.uid ?? '—'}, doc en Firestore=${c.usuario ? 'sí' : 'no'})`));

if (!confirmar) {
  console.log('\nDry-run: no se borró nada. Vuelve a correr con --confirm para borrar de verdad.');
  process.exit(0);
}

for (const t of tickets) {
  await ticketRepo.eliminar(t!.id);
  console.log(`Borrado ticket #${t!.numero}`);
}
if (contactoDemo) {
  await contactoRepo.eliminar(contactoDemo.id);
  console.log('Borrado contacto demo');
}
if (empresaDemo) {
  await empresaRepo.eliminar(empresaDemo.id);
  console.log('Borrada empresa demo');
}
for (const cuenta of cuentas) {
  if (cuenta.uid) {
    await auth.deleteUser(cuenta.uid).catch((err: unknown) => {
      console.warn(`No se pudo borrar la cuenta de Auth de ${cuenta.email}:`, err);
    });
  }
  if (cuenta.usuario) {
    await usuarios.delete(cuenta.usuario.uid);
  }
  console.log(`Borrada cuenta ${cuenta.email}`);
}

console.log('\nListo — datos de prueba eliminados de producción.');
process.exit(0);
