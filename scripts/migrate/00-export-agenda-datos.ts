/**
 * Paso 0: vuelca el documento monolítico `agenda/datos` del proyecto Firebase VIEJO a
 * `scratchpad/agenda-datos.json` para inspección y para los importadores siguientes.
 *
 * Requiere credenciales del proyecto VIEJO:
 *   OLD_FIREBASE_PROJECT_ID=...  OLD_FIREBASE_SERVICE_ACCOUNT_B64=<base64 del JSON>
 *
 * Uso: tsx scripts/migrate/00-export-agenda-datos.ts
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { EXPORT_PATH } from './lib.js';

const projectId = process.env.OLD_FIREBASE_PROJECT_ID;
const saB64 = process.env.OLD_FIREBASE_SERVICE_ACCOUNT_B64;
if (!projectId || !saB64) {
  console.error('Faltan OLD_FIREBASE_PROJECT_ID y/o OLD_FIREBASE_SERVICE_ACCOUNT_B64.');
  process.exit(1);
}

const app = initializeApp(
  { projectId, credential: cert(JSON.parse(Buffer.from(saB64, 'base64').toString('utf8'))) },
  'old',
);
const db = getFirestore(app);

const snap = await db.collection('agenda').doc('datos').get();
if (!snap.exists) {
  console.error('El documento agenda/datos no existe en el proyecto viejo.');
  process.exit(1);
}

// Colecciones aparte que también hay que traer.
const extra: Record<string, unknown[]> = {};
for (const col of ['tickets_publicos', 'knowledge_base', 'inscripciones_evento', 'staff_aprobado']) {
  const q = await db.collection(col).get();
  extra[col] = q.docs.map((d) => ({ _id: d.id, ...d.data() }));
}

mkdirSync(dirname(EXPORT_PATH), { recursive: true });
writeFileSync(EXPORT_PATH, JSON.stringify({ ...snap.data(), __colecciones: extra }, null, 2));
console.log(`Export escrito en ${EXPORT_PATH}`);
process.exit(0);
