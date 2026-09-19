import { FirestoreRestClient } from './src/infrastructure/firestore-rest/FirestoreRestClient.js';
import { parseServiceAccount } from './src/infrastructure/firestore-rest/serviceAccountAuth.js';
const sa = parseServiceAccount(process.env.FIREBASE_SERVICE_ACCOUNT_B64!);
const db = new FirestoreRestClient({ projectId: process.env.FIREBASE_PROJECT_ID!, serviceAccount: sa });
for (const col of ['empresas','contactos','tickets','bitacora','eventos','versiones','kb']) {
  console.log(String((await db.collection(col).count().get()).data().count).padStart(6), col);
}
console.log(String((await db.collectionGroup('eventos').count().get()).data().count).padStart(6), 'eventos de tickets (subcolección)');
