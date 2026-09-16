import type { PizarraKB } from '../../entities/PizarraKB.js';

/** Persistencia de la pizarra personal de cada usuario (`pizarras_kb/{uid}`). */
export interface IPizarraKBRepository {
  obtener(uid: string): Promise<PizarraKB | null>;
  guardar(pizarra: PizarraKB): Promise<void>;
}
