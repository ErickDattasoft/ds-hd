import type { Firestore } from 'firebase-admin/firestore';
import type {
  EstadoIntentosLogin,
  IIntentosLoginRepository,
} from '../../core/ports/repositories/IIntentosLoginRepository.js';
import { Timestamp } from '../../core/entities/value-objects/Timestamp.js';
import { LOGIN_BLOQUEO_MS, LOGIN_MAX_INTENTOS, LOGIN_VENTANA_MS } from '../../config/constants.js';

const COL = 'intentos_login';

interface DocIntentos {
  fallidos?: number;
  primerFalloEn?: Timestamp;
  bloqueadoHasta?: Timestamp | null;
}

/** Clave de documento a partir del correo (Firestore no admite `/` en los ids). */
function claveDoc(email: string): string {
  return email.trim().toLowerCase().replace(/\//g, '_');
}

/**
 * Antiabuso de login sobre Firestore (`intentos_login/{correo}`). Sirve para ambos drivers
 * (Admin SDK y REST) porque solo usa la parte común del API de `Firestore`.
 */
export class FirestoreIntentosLoginRepository implements IIntentosLoginRepository {
  constructor(private readonly db: Firestore) {}

  async consultar(email: string, ahora: Date): Promise<EstadoIntentosLogin> {
    const snap = await this.db.collection(COL).doc(claveDoc(email)).get();
    if (!snap.exists) return { fallidos: 0, bloqueadoHasta: null };
    const data = (snap.data() ?? {}) as DocIntentos;
    return this.aEstado(data, ahora);
  }

  async registrarFallo(email: string, ahora: Date): Promise<EstadoIntentosLogin> {
    const ref = this.db.collection(COL).doc(claveDoc(email));
    const snap = await ref.get();
    const data = (snap.exists ? (snap.data() ?? {}) : {}) as DocIntentos;

    const primerFalloMs = data.primerFalloEn?.toMillis() ?? ahora.getTime();
    const dentroDeVentana = ahora.getTime() - primerFalloMs < LOGIN_VENTANA_MS;

    const fallidos = dentroDeVentana ? (data.fallidos ?? 0) + 1 : 1;
    const primerFalloEn = dentroDeVentana
      ? Timestamp.fromMillis(primerFalloMs)
      : Timestamp.fromDate(ahora);
    const bloqueadoHasta =
      fallidos >= LOGIN_MAX_INTENTOS
        ? Timestamp.fromMillis(ahora.getTime() + LOGIN_BLOQUEO_MS)
        : null;

    await ref.set({ fallidos, primerFalloEn, bloqueadoHasta }, { merge: true });
    return this.aEstado({ fallidos, primerFalloEn, bloqueadoHasta }, ahora);
  }

  async limpiar(email: string): Promise<void> {
    await this.db.collection(COL).doc(claveDoc(email)).delete();
  }

  private aEstado(data: DocIntentos, ahora: Date): EstadoIntentosLogin {
    const hastaMs = data.bloqueadoHasta?.toMillis() ?? 0;
    return {
      fallidos: data.fallidos ?? 0,
      bloqueadoHasta: hastaMs > ahora.getTime() ? new Date(hastaMs) : null,
    };
  }
}
