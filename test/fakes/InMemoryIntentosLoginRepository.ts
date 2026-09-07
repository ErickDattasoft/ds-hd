import type {
  EstadoIntentosLogin,
  IIntentosLoginRepository,
} from '../../src/core/ports/repositories/IIntentosLoginRepository.js';
import {
  LOGIN_BLOQUEO_MS,
  LOGIN_MAX_INTENTOS,
  LOGIN_VENTANA_MS,
} from '../../src/config/constants.js';

interface Registro {
  fallidos: number;
  primerFalloEn: number;
  bloqueadoHasta: number | null;
}

/** Fake en memoria de {@link IIntentosLoginRepository}. */
export class InMemoryIntentosLoginRepository implements IIntentosLoginRepository {
  private readonly porEmail = new Map<string, Registro>();

  private clave(email: string): string {
    return email.trim().toLowerCase();
  }

  async consultar(email: string, ahora: Date): Promise<EstadoIntentosLogin> {
    const r = this.porEmail.get(this.clave(email));
    if (!r) return { fallidos: 0, bloqueadoHasta: null };
    return {
      fallidos: r.fallidos,
      bloqueadoHasta:
        r.bloqueadoHasta && r.bloqueadoHasta > ahora.getTime() ? new Date(r.bloqueadoHasta) : null,
    };
  }

  async registrarFallo(email: string, ahora: Date): Promise<EstadoIntentosLogin> {
    const k = this.clave(email);
    const previo = this.porEmail.get(k);
    const dentroDeVentana = previo && ahora.getTime() - previo.primerFalloEn < LOGIN_VENTANA_MS;

    const fallidos = dentroDeVentana ? previo!.fallidos + 1 : 1;
    const primerFalloEn = dentroDeVentana ? previo!.primerFalloEn : ahora.getTime();
    const bloqueadoHasta =
      fallidos >= LOGIN_MAX_INTENTOS ? ahora.getTime() + LOGIN_BLOQUEO_MS : null;

    this.porEmail.set(k, { fallidos, primerFalloEn, bloqueadoHasta });
    return {
      fallidos,
      bloqueadoHasta: bloqueadoHasta ? new Date(bloqueadoHasta) : null,
    };
  }

  async limpiar(email: string): Promise<void> {
    this.porEmail.delete(this.clave(email));
  }
}
