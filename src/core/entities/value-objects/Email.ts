import { ValidationError } from '../../errors/DomainError.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Correo normalizado (minúsculas, sin espacios). Value object: dos `Email` con el mismo
 * texto son equivalentes; se construye solo por la fábrica validadora.
 */
export class Email {
  private constructor(public readonly value: string) {}

  static create(raw: string, campo = 'email'): Email {
    const normalizado = (raw ?? '').trim().toLowerCase();
    if (!EMAIL_RE.test(normalizado)) {
      throw new ValidationError(`Correo inválido: ${raw}`, { [campo]: 'Correo no válido' });
    }
    return new Email(normalizado);
  }

  /** Igual que `create` pero devuelve `null` en vez de lanzar. */
  static tryCreate(raw: string): Email | null {
    try {
      return Email.create(raw);
    } catch {
      return null;
    }
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
