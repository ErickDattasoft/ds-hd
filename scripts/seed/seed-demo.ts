import 'dotenv/config';
/**
 * Datos de demostración para el emulador: 2 agentes, una empresa + contacto de portal
 * (con su cuenta cliente), configuración de tickets con correo de notificación, y unos
 * tickets de ejemplo en distintos estados. Los usa también `capture-screenshots.ts` para
 * tener con qué recorrer cada rol.
 *
 * Uso: npm run seed:demo   (requiere el emulador de Firebase corriendo)
 */
import { buildContainer } from '../../src/config/container.js';
import { loadConfig } from '../../src/config/env.js';
import { Usuario } from '../../src/core/entities/Usuario.js';
import { Contacto } from '../../src/core/entities/Contacto.js';
import { CONFIG_TICKETS_POR_DEFECTO } from '../../src/core/entities/ConfiguracionTickets.js';
import type { SessionUser } from '../../src/application/shared/SessionUser.js';

const c = buildContainer(loadConfig());
const auth = c.resolve('authProvider');
const usuarios = c.resolve('usuarioRepo');
const config = c.resolve('configuracionRepo');
const crearTicket = c.resolve('crearTicketService');
const empresas = c.resolve('empresaService');
const contactos = c.resolve('contactoRepo');

const actorSistema: SessionUser = {
  uid: 'seed',
  nombre: 'Seed',
  email: 'seed@dattasoft.mx',
  rol: 'admin',
  empresaId: null,
  activo: true,
  esStaff: true,
  esCliente: false,
  permisos: ['tickets:crear', 'empresas:crear', 'contactos:crear'],
};

async function agente(email: string, nombre: string, grupo: string) {
  if (await usuarios.findByEmail(email)) return;
  const { uid } = await auth.createAccount({ email, password: 'agente12345', nombre });
  await auth.setRoleClaim(uid, 'agente');
  await usuarios.save(
    new Usuario({
      uid,
      email,
      nombre,
      rol: 'agente',
      agente: { grupo, capacidadMax: 5, disponibleAsignacion: true },
    }),
  );
  console.log(`Agente: ${email} / agente12345`);
}

await agente('ana@dattasoft.mx', 'Ana Soporte', 'Soporte');
await agente('beto@dattasoft.mx', 'Beto Sistemas', 'Sistemas');

const EMPRESA_DEMO = 'Comercializadora Demo SA de CV';
let empresaDemo = (await empresas.listar()).find((e) => e.nombre === EMPRESA_DEMO);
if (!empresaDemo) {
  empresaDemo = await empresas.crear(actorSistema, {
    nombre: EMPRESA_DEMO,
    rfc: 'CDE010101AAA',
    email: 'contacto@comercializadora-demo.mx',
    telefono: '555-000-1111',
    sistemasContratados: ['CONTPAQi Contabilidad', 'CONTPAQi Nóminas'],
  });
  console.log(`Empresa demo: ${empresaDemo.nombre}`);
}

const EMAIL_CLIENTE = 'cliente@dattasoft.mx';
if (!(await usuarios.findByEmail(EMAIL_CLIENTE))) {
  const { uid } = await auth.createAccount({
    email: EMAIL_CLIENTE,
    password: 'cliente12345',
    nombre: 'Cliente Demo',
  });
  await auth.setRoleClaim(uid, 'cliente');
  await usuarios.save(
    new Usuario({
      uid,
      email: EMAIL_CLIENTE,
      nombre: 'Cliente Demo',
      rol: 'cliente',
      empresaId: empresaDemo.id,
    }),
  );
  await contactos.save(
    new Contacto({
      id: c.resolve('idGenerator').newId(),
      nombre: 'Cliente Demo',
      empresaId: empresaDemo.id,
      email: EMAIL_CLIENTE,
      esPortal: true,
      uid,
    }),
  );
  console.log(`Cliente portal: ${EMAIL_CLIENTE} / cliente12345`);
}

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
    empresaId: empresaDemo.id,
    contactoNombre: 'Cliente Demo',
    contactoCorreo: EMAIL_CLIENTE,
  });
}

console.log('Seed demo completo.');
process.exit(0);
