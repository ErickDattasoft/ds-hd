/**
 * Marca de tiempo con precisión de milisegundo, sin depender de `firebase-admin` (ese import
 * arrastra todo el SDK de Firestore — gRPC incluido — a cualquier bundle que lo toque, lo
 * cual rompe el build para Cloudflare Workers). Los mappers de `infrastructure/firestore/`
 * usan esta clase en vez de `firebase-admin/firestore`'s `Timestamp`; cada adaptador de
 * Firestore (Admin SDK local, REST en Workers) la traduce a su propio formato en el borde.
 */
export class Timestamp {
  private constructor(private readonly millis: number) {}

  static fromDate(d: Date): Timestamp {
    return new Timestamp(d.getTime());
  }

  static fromMillis(millis: number): Timestamp {
    return new Timestamp(millis);
  }

  static now(): Timestamp {
    return new Timestamp(Date.now());
  }

  toDate(): Date {
    return new Date(this.millis);
  }

  toMillis(): number {
    return this.millis;
  }
}
