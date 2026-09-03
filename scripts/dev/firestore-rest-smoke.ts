/**
 * Smoke test manual del FirestoreRestClient contra el proyecto real (NO el emulador — la
 * API REST no la sirve el emulador). Uso:
 *   DOTENV_CONFIG_PATH=.env.real npx tsx -r dotenv/config scripts/dev/firestore-rest-smoke.ts
 */
import { FirestoreRestClient } from '../../src/infrastructure/firestore-rest/FirestoreRestClient.js';
import { parseServiceAccount } from '../../src/infrastructure/firestore-rest/serviceAccountAuth.js';
import { Timestamp } from '../../src/core/entities/value-objects/Timestamp.js';

const projectId = process.env.FIREBASE_PROJECT_ID!;
const sa = parseServiceAccount(process.env.FIREBASE_SERVICE_ACCOUNT_B64!);
const db = new FirestoreRestClient({ projectId, serviceAccount: sa });

const COL = '_smoke_rest';
const id = `s-${Date.now()}`;
const ok = (m: string) => console.log(`  ✓ ${m}`);

console.log(`Proyecto ${projectId}, colección ${COL}/${id}`);

// set + get
await db.collection(COL).doc(id).set({
  nombre: 'Prueba REST',
  n: 42,
  activo: true,
  creado: Timestamp.fromDate(new Date('2026-09-03T10:00:00Z')),
  tags: ['a', 'b'],
  meta: { anidado: true, cuenta: 3 },
});
const snap = await db.collection(COL).doc(id).get();
if (!snap.exists) throw new Error('el doc no existe tras set');
const d = snap.data()!;
if (d.nombre !== 'Prueba REST' || d.n !== 42 || d.activo !== true) throw new Error('escalares mal');
if (!(d.creado instanceof Timestamp)) throw new Error('timestamp no deserializó a Timestamp');
if (d.creado.toDate().toISOString() !== '2026-09-03T10:00:00.000Z') throw new Error('timestamp valor mal');
if (JSON.stringify(d.tags) !== '["a","b"]') throw new Error('array mal');
if ((d.meta as { cuenta: number }).cuenta !== 3) throw new Error('map anidado mal');
ok('set + get (escalares, timestamp, array, map)');

// where
const q = await db.collection(COL).where('nombre', '==', 'Prueba REST').limit(10).get();
if (!q.docs.some((x) => x.id === id)) throw new Error('la query no devolvió el doc');
ok(`where + limit (${q.size} docs)`);

// orderBy (solo, sin filtro) + limit
const q2 = await db.collection(COL).orderBy('n', 'desc').limit(5).get();
if (q2.size === 0) throw new Error('orderBy no devolvió nada');
ok(`orderBy + limit (${q2.size} docs)`);

// count
const { data } = await db.collection(COL).where('activo', '==', true).count().get();
if (typeof data().count !== 'number' || data().count < 1) throw new Error('count mal');
ok(`count = ${data().count}`);

// update
await db.collection(COL).doc(id).update({ n: 99 });
const s2 = await db.collection(COL).doc(id).get();
if (s2.data()!.n !== 99 || s2.data()!.nombre !== 'Prueba REST') throw new Error('update no fusionó');
ok('update (merge parcial)');

// transacción read-modify-write
const nuevo = await db.runTransaction(async (tx) => {
  const cur = await tx.get(db.collection(COL).doc(id));
  const v = Number(cur.data()!.n) + 1;
  tx.set(db.collection(COL).doc(id), { n: v }, { merge: true });
  return v;
});
const s3 = await db.collection(COL).doc(id).get();
if (s3.data()!.n !== nuevo || nuevo !== 100) throw new Error(`transacción mal (n=${s3.data()!.n})`);
ok('runTransaction (read-modify-write)');

// delete
await db.collection(COL).doc(id).delete();
const s4 = await db.collection(COL).doc(id).get();
if (s4.exists) throw new Error('el doc sigue existiendo tras delete');
ok('delete');

console.log('\nTodo OK ✅');
process.exit(0);
