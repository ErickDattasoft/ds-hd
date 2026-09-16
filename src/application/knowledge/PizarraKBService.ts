import type { IPizarraKBRepository } from '../../core/ports/repositories/IPizarraKBRepository.js';
import type { IClock } from '../../core/ports/services/IClock.js';
import { PIZARRA_KB_MAX } from '../../core/entities/PizarraKB.js';
import { ValidationError } from '../../core/errors/DomainError.js';
import type { SessionUser } from '../shared/SessionUser.js';

/** Pizarra temporal: bloc de notas personal con autoguardado, una por usuario. */
export class PizarraKBService {
  constructor(
    private readonly repo: IPizarraKBRepository,
    private readonly clock: IClock,
  ) {}

  async obtener(actor: SessionUser): Promise<string> {
    const p = await this.repo.obtener(actor.uid);
    return p?.contenido ?? '';
  }

  async guardar(actor: SessionUser, contenido: string): Promise<Date> {
    if (contenido.length > PIZARRA_KB_MAX) {
      throw new ValidationError(`La pizarra no puede pasar de ${PIZARRA_KB_MAX} caracteres`, {
        contenido: 'Muy largo',
      });
    }
    const actualizadoEn = this.clock.now();
    await this.repo.guardar({ uid: actor.uid, contenido, actualizadoEn });
    return actualizadoEn;
  }
}
