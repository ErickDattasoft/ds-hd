import type { IClock } from '../../core/ports/services/IClock.js';

/** Reloj real del sistema. */
export class SystemClock implements IClock {
  now(): Date {
    return new Date();
  }
}
