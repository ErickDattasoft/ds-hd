import type { IUsuarioRepository } from '../../core/ports/repositories/IUsuarioRepository.js';
import type { IClock } from '../../core/ports/services/IClock.js';
import { NotFoundError } from '../../core/errors/DomainError.js';
import type { SessionUser } from '../shared/SessionUser.js';

/** Caso de uso: un usuario de staff fija su propia firma para respuestas de tickets. */
export class ActualizarMiFirmaService {
  constructor(
    private readonly usuarios: IUsuarioRepository,
    private readonly clock: IClock,
  ) {}

  async ejecutar(input: { actor: SessionUser; firma: string }): Promise<void> {
    const usuario = await this.usuarios.findByUid(input.actor.uid);
    if (!usuario) throw new NotFoundError('Usuario', input.actor.uid);

    usuario.fijarFirma(input.firma, this.clock.now());
    await this.usuarios.save(usuario);
  }
}
