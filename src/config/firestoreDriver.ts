/**
 * Selección del driver de Firestore/Auth por config (`FIRESTORE_DRIVER`).
 *
 * - `admin` (por defecto): firebase-admin SDK — lo arma `container.ts` vía `initFirebase`.
 * - `rest`: cliente REST propio (`fetch`, sin gRPC) para Cloudflare Workers. Este módulo
 *   NO importa `firebase-admin`, así que el bundle de Workers puede excluirlo entero.
 */
import type { Firestore } from 'firebase-admin/firestore';
import type { AppConfig } from './env.js';
import type { ILogger } from '../core/ports/services/ILogger.js';
import type { IAuthProvider } from '../core/ports/services/IAuthProvider.js';
import { FirestoreRestClient } from '../infrastructure/firestore-rest/FirestoreRestClient.js';
import { parseServiceAccount } from '../infrastructure/firestore-rest/serviceAccountAuth.js';
import { FirebaseAuthRestProvider } from '../infrastructure/auth/FirebaseAuthRestProvider.js';

export interface DriverFirestore {
  /** Cliente REST casteado a `Firestore` — los repos usan solo la superficie común. */
  readonly firestore: Firestore;
  readonly authProvider: IAuthProvider;
}

/**
 * Devuelve el driver REST si `FIRESTORE_DRIVER=rest`; `null` si es `admin` (lo maneja
 * `container.ts` con `initFirebase`). Lanza si falta configuración para el modo REST real.
 */
export function resolverDriverFirestore(
  config: AppConfig,
  logger: ILogger,
): DriverFirestore | null {
  if (config.firebase.driver !== 'rest') return null;

  const fb = config.firebase;
  const emulatorHost = fb.emulatorHost || process.env.FIRESTORE_EMULATOR_HOST || '';
  const authEmulatorHost = fb.authEmulatorHost || process.env.FIREBASE_AUTH_EMULATOR_HOST || '';
  const serviceAccount = fb.serviceAccountB64 ? parseServiceAccount(fb.serviceAccountB64) : undefined;

  if (!emulatorHost && !serviceAccount) {
    throw new Error(
      'FIRESTORE_DRIVER=rest necesita FIREBASE_SERVICE_ACCOUNT_B64 (producción) o FIRESTORE_EMULATOR_HOST (dev).',
    );
  }

  const firestore = new FirestoreRestClient({
    projectId: fb.projectId,
    ...(serviceAccount ? { serviceAccount } : {}),
    ...(emulatorHost ? { emulatorHost } : {}),
  }) as unknown as Firestore;

  const authProvider = new FirebaseAuthRestProvider(
    {
      projectId: fb.projectId,
      apiKey: fb.apiKey,
      ...(serviceAccount ? { serviceAccount } : {}),
      ...(authEmulatorHost ? { emulatorHost: authEmulatorHost } : {}),
    },
    logger,
  );

  logger.info('driver Firestore: REST', { projectId: fb.projectId, emulador: Boolean(emulatorHost) });
  return { firestore, authProvider };
}
