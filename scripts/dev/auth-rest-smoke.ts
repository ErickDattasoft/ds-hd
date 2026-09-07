/**
 * Smoke del FirebaseAuthRestProvider contra Identity Toolkit REAL (con el service account,
 * no el emulador — así se ejercita el flujo JWT→OAuth2 de verdad). Uso:
 *   DOTENV_CONFIG_PATH=.env.real npx tsx -r dotenv/config scripts/dev/auth-rest-smoke.ts
 * Crea y BORRA su cuenta de prueba al terminar.
 */
import { FirebaseAuthRestProvider } from '../../src/infrastructure/auth/FirebaseAuthRestProvider.js';
import {
  makeBearerTokenGetter,
  parseServiceAccount,
} from '../../src/infrastructure/firestore-rest/serviceAccountAuth.js';

const projectId = process.env.FIREBASE_PROJECT_ID!;
const apiKey = process.env.FIREBASE_API_KEY!;
const sa = parseServiceAccount(process.env.FIREBASE_SERVICE_ACCOUNT_B64!);
const logger = { debug() {}, info() {}, warn: console.warn, error: console.error, child() { return logger; } } as never;

const auth = new FirebaseAuthRestProvider({ projectId, apiKey, serviceAccount: sa }, logger);
const bearer = makeBearerTokenGetter(sa);
const ok = (m: string) => console.log(`  ✓ ${m}`);
const email = `smoke-${Date.now()}@ds-hd.test`;

console.log(`Proyecto ${projectId}, cuenta ${email}`);

const { uid } = await auth.createAccount({ email, password: 'contra12345', nombre: 'Smoke' });
if (!uid) throw new Error('createAccount sin uid');
ok(`createAccount → ${uid}`);

try {
  await auth.createAccount({ email, password: 'otra-valida-99', nombre: 'y' });
  throw new Error('createAccount duplicado NO lanzó');
} catch (e) {
  if ((e as Error).constructor.name !== 'ConflictError') throw e;
  ok('correo repetido → ConflictError');
}

const ver = await auth.verifyPassword(email, 'contra12345');
if (ver.uid !== uid) throw new Error('verifyPassword uid mal');
ok('verifyPassword');

try {
  await auth.verifyPassword(email, 'mala');
  throw new Error('verifyPassword con contra mala NO lanzó');
} catch (e) {
  if ((e as Error).constructor.name !== 'UnauthorizedError') throw e;
  ok('verifyPassword incorrecto → UnauthorizedError');
}

await auth.setPassword(uid, 'nueva-99');
if ((await auth.verifyPassword(email, 'nueva-99')).uid !== uid) throw new Error('setPassword no aplicó');
ok('setPassword');

await auth.setRolesClaim(uid, ['agente', 'ventas']);
ok('setRolesClaim');

await auth.revokeSessions(uid);
ok('revokeSessions (validSince)');

if ((await auth.getUidByEmail(email)) !== uid) throw new Error('getUidByEmail mal');
if ((await auth.getUidByEmail(`nadie-${Date.now()}@x.test`)) !== null) throw new Error('getUidByEmail debería ser null');
ok('getUidByEmail');

const link = await auth.generatePasswordResetLink(email);
if (!link.includes('oobCode') && !link.startsWith('http')) throw new Error(`reset link raro: ${link}`);
ok('generatePasswordResetLink');

await auth.setDisabled(uid, true);
try {
  await auth.verifyPassword(email, 'nueva-99');
  throw new Error('cuenta deshabilitada pudo hacer login');
} catch (e) {
  if ((e as Error).constructor.name !== 'UnauthorizedError') throw e;
  ok('setDisabled(true) bloquea login');
}

// limpieza: accounts:delete (no está en IAuthProvider, va por REST directo)
const res = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:delete`, {
  method: 'POST',
  headers: { authorization: `Bearer ${await bearer()}`, 'content-type': 'application/json' },
  body: JSON.stringify({ localId: uid }),
});
console.log(res.ok ? '  ✓ cuenta de prueba borrada' : `  ! no se pudo borrar (${res.status})`);

console.log('\nTodo OK ✅');
process.exit(0);
