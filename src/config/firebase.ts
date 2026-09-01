import { cert, getApps, initializeApp, applicationDefault, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getStorage, type Storage } from 'firebase-admin/storage';
import type { AppConfig } from './env.js';
import type { ILogger } from '../core/ports/services/ILogger.js';

/**
 * Inicialización única de firebase-admin. Todo acceso a Firestore/Auth/Storage del servidor
 * pasa por aquí; el SDK web NUNCA se usa (las reglas de Firestore quedan en deny-all).
 */
export type FirebaseServices = {
  readonly app: App;
  readonly firestore: Firestore;
  readonly auth: Auth;
  readonly storage: Storage;
};

function resolveCredential(cfg: AppConfig['firebase']) {
  if (cfg.serviceAccountB64) {
    const json = Buffer.from(cfg.serviceAccountB64, 'base64').toString('utf8');
    return cert(JSON.parse(json));
  }
  // Cae a GOOGLE_APPLICATION_CREDENTIALS / metadata del entorno (Docker secret, etc.).
  return applicationDefault();
}

/**
 * Devuelve los servicios de Firebase, o `null` si `DISABLE_FIREBASE=true`
 * (permite levantar la app para smoke tests / health de arranque sin credenciales).
 */
export function initFirebase(config: AppConfig, logger: ILogger): FirebaseServices | null {
  if (config.firebase.disabled) {
    logger.warn('firebase-admin deshabilitado (DISABLE_FIREBASE=true): sin acceso a datos');
    return null;
  }

  if (config.firebase.emulatorHost && !process.env.FIRESTORE_EMULATOR_HOST) {
    process.env.FIRESTORE_EMULATOR_HOST = config.firebase.emulatorHost;
  }
  const usingEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

  const app =
    getApps()[0] ??
    initializeApp({
      projectId: config.firebase.projectId,
      ...(usingEmulator ? {} : { credential: resolveCredential(config.firebase) }),
      ...(config.firebase.storageBucket ? { storageBucket: config.firebase.storageBucket } : {}),
    });

  const firestore = getFirestore(app);
  firestore.settings({ ignoreUndefinedProperties: true });

  logger.info('firebase-admin inicializado', {
    projectId: config.firebase.projectId,
    emulator: usingEmulator,
  });

  return { app, firestore, auth: getAuth(app), storage: getStorage(app) };
}
