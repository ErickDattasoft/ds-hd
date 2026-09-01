import type { IClock } from '../../src/core/ports/services/IClock.js';
import type { ILogger } from '../../src/core/ports/services/ILogger.js';

/** Reloj fijo para tests deterministas. */
export class FixedClock implements IClock {
  constructor(private fecha: Date) {}
  now(): Date {
    return this.fecha;
  }
  set(fecha: Date): void {
    this.fecha = fecha;
  }
  avanzarMs(ms: number): void {
    this.fecha = new Date(this.fecha.getTime() + ms);
  }
}

/** Logger silencioso. */
export const silentLogger: ILogger = {
  debug() {},
  info() {},
  warn() {},
  error() {},
  child() {
    return silentLogger;
  },
};
