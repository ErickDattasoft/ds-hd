/**
 * Datos de demostración para el emulador: 2 agentes, configuración de tickets con correo
 * de notificación, y unos tickets de ejemplo en distintos estados.
 *
 * Uso: npm run seed:demo   (requiere el emulador de Firebase corriendo)
 */
import { buildContainer } from '../../src/config/container.js';
import { loadConfig } from '../../src/config/env.js';
import { Usuario } from '../../src/core/entities/Usuario.js';
import { CONFIG_TICKETS_POR_DEFECTO } from '../../src/core/entities/ConfiguracionTickets.js';
import type { SessionUser } from '../../src/application/shared/SessionUser.js';

const c = buildContainer(loadConfig());
const auth = c.resolve('authProvider');
const usuarios = c.resolve('usuarioRepo');
const config = c.resolve('configuracionRepo');
const crearTicket = c.resolve('crearTicketService');

const actorSistema: SessionUser = {
  uid: 'seed',
  nombre: 'Seed',
  email: 'seed@dattasoft.mx',
  rol: 'admin',
  empresaId: null,
  activo: true,
  esStaff: true,
  esCliente: false,
  permisos: ['tickets:crear'],
};

async function agente(email: string, nombre: string, grupo: string) {
  if (await usuarios.findByEmail(email)) return;
  const { uid } = await auth.createAccount({ email, password: 'agente12345', nombre });
  await auth.setRoleClaim(uid, 'agente');
  await usuarios.save(
    new Usuario({ uid, email, nombre, rol: 'agente', agente: { grupo, capacidadMax: 5, disponibleAsignacion: true } }),
  );
  console.log(`Agente: ${email} / agente12345`);
}

await agente('ana@dattasoft.mx', 'Ana Soporte', 'Soporte');
await agente('beto@dattasoft.mx', 'Beto Sistemas', 'Sistemas');

await config.guardarTickets({
  ...CONFIG_TICKETS_POR_DEFECTO,
  correosNotificacion: ['soporte@dattasoft.mx'],
});

for (const [asunto, prioridad] of [
  ['No abre Contabilidad', 'Alta'],
  ['Error al timbrar nómina', 'Urgente'],
  ['Duda sobre respaldo', 'Baja'],
] as const) {
  await crearTicket.ejecutar({
    actor: actorSistema,
    asunto,
    descripcion: `${asunto} — ticket de ejemplo generado por el seed.`,
    tipo: 'Soporte Técnico',
    prioridad,
    contactoNombre: 'Cliente Demo',
    contactoCorreo: 'demo@cliente.com',
  });
}

console.log('Seed demo completo.');
process.exit(0);
