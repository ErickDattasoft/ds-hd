import { randomBytes, randomUUID } from 'node:crypto';
import type { IIdGenerator } from '../../core/ports/services/IIdGenerator.js';

/** Generador de ids basado en el módulo `crypto` de Node. */
export class UuidGenerator implements IIdGenerator {
  newId(): string {
    return randomUUID();
  }

  newToken(): string {
    return randomBytes(32).toString('base64url');
  }
}
