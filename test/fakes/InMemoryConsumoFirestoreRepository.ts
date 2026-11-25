import type { ConsumoDia, IConsumoFirestoreRepository } from '../../src/core/ports/repositories/IConsumoFirestoreRepository.js';

/** Fake en memoria de {@link IConsumoFirestoreRepository}. */
export class InMemoryConsumoFirestoreRepository implements IConsumoFirestoreRepository {
  readonly dias = new Map<string, ConsumoDia>();

  async delDia(dia: string): Promise<ConsumoDia | null> {
    return this.dias.get(dia) ?? null;
  }
}
