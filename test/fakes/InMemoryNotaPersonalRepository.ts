import type { INotaPersonalRepository } from '../../src/core/ports/repositories/INotaPersonalRepository.js';
import type { NotaPersonal } from '../../src/core/entities/NotaPersonal.js';

/** Fake en memoria de {@link INotaPersonalRepository}. */
export class InMemoryNotaPersonalRepository implements INotaPersonalRepository {
  readonly porUid = new Map<string, NotaPersonal[]>();
  lecturas = 0;

  async obtener(uid: string): Promise<NotaPersonal[]> {
    this.lecturas++;
    return (this.porUid.get(uid) ?? []).map((n) => ({ ...n }));
  }

  async listarTodas(): Promise<{ uid: string; notas: NotaPersonal[] }[]> {
    return [...this.porUid.entries()].map(([uid, notas]) => ({ uid, notas: notas.map((n) => ({ ...n })) }));
  }

  async guardar(uid: string, notas: NotaPersonal[]): Promise<void> {
    this.porUid.set(uid, notas.map((n) => ({ ...n })));
  }
}
