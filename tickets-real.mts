/** Ejecuta el importador de TICKETS contra el Firestore real y enseña el error exacto si falla. */
import { readFileSync } from 'node:fs';
import { FirestoreRestClient } from './src/infrastructure/firestore-rest/FirestoreRestClient.js';
import { parseServiceAccount } from './src/infrastructure/firestore-rest/serviceAccountAuth.js';
import { crearImportadores } from './src/application/migracion/importadores.js';
import { seccionDatos } from './src/application/migracion/lib.js';
import { FirestoreTicketRepository } from './src/infrastructure/firestore/FirestoreTicketRepository.js';
import { FirestoreTicketQueries } from './src/infrastructure/firestore/FirestoreTicketQueries.js';
import { FirestoreContadorRepository } from './src/infrastructure/firestore/FirestoreContadorRepository.js';

const sa = parseServiceAccount(process.env.FIREBASE_SERVICE_ACCOUNT_B64!);
const db = new FirestoreRestClient({ projectId: process.env.FIREBASE_PROJECT_ID!, serviceAccount: sa }) as never;
const repos: Record<string, unknown> = {
  ticketRepo: new FirestoreTicketRepository(db),
  ticketQueries: new FirestoreTicketQueries(db),
  contadorRepo: new FirestoreContadorRepository(db),
};
const c = { resolve: (k: string) => repos[k] } as never;
const datos = seccionDatos(JSON.parse(readFileSync('/mnt/d/WORK/WORK VA/RESPALDOS VA CRM/crm-backup-2026-09-19_15-44-43.json','utf8')));
const lineas: string[] = [];
const imp = crearImportadores({ dryRun: false, log: (p, m) => lineas.push(`${p}: ${m}`) });
try {
  const r = await imp.importarTickets(c, datos);
  console.log('RESULTADO:', JSON.stringify(r));
} catch (e) {
  console.log('EXCEPCIÓN:', e instanceof Error ? e.message.slice(0, 900) : e);
}
console.log(lineas.slice(-6).join('\n'));
