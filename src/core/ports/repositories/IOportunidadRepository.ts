import type { Oportunidad } from '../../entities/Oportunidad.js';

/** Persistencia del embudo de ventas (`oportunidades/{id}`). */
export interface IOportunidadRepository {
  findById(id: string): Promise<Oportunidad | null>;
  list(): Promise<Oportunidad[]>;
  save(o: Oportunidad): Promise<void>;
  delete(id: string): Promise<void>;
}
