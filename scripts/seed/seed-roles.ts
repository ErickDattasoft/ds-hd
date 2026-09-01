import 'dotenv/config';
/**
 * Siembra la cuenta de administrador inicial (identidad + documento `usuarios/{uid}`).
 * Los roles en sí viven en el código (`interfaces/http/rbac/roles.ts`); esto solo crea
 * el primer usuario con el que entrar.
 *
 * Uso:
 *   SEED_ADMIN_EMAIL=admin@dattasoft.mx SEED_ADMIN_PASSWORD=... npm run seed:roles
 * o pasando --email / --password / --nombre.
 */
import { parseArgs } from 'node:util';
import { buildContainer } from '../../src/config/container.js';
import { loadConfig } from '../../src/config/env.js';
import { Usuario } from '../../src/core/entities/Usuario.js';

const { values } = parseArgs({
  options: {
    email: { type: 'string' },
    password: { type: 'string' },
    nombre: { type: 'string' },
  },
});

const email = values.email ?? process.env.SEED_ADMIN_EMAIL ?? 'admin@dattasoft.mx';
const password = values.password ?? process.env.SEED_ADMIN_PASSWORD ?? 'admin12345';
const nombre = values.nombre ?? process.env.SEED_ADMIN_NOMBRE ?? 'Administrador';

const container = buildContainer(loadConfig());
const auth = container.resolve('authProvider');
const usuarios = container.resolve('usuarioRepo');

const existente = await usuarios.findByEmail(email);
if (existente) {
  console.log(`Ya existe un usuario con ${email} (rol ${existente.rol}). Nada que hacer.`);
  process.exit(0);
}

const { uid } = await auth.createAccount({ email, password, nombre });
await auth.setRoleClaim(uid, 'admin');
await usuarios.save(new Usuario({ uid, email, nombre, rol: 'admin' }));

console.log(`Admin creado: ${email} / contraseña: ${password} (uid ${uid})`);
process.exit(0);
