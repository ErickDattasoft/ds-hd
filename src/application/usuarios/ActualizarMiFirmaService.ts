import type { IUsuarioRepository } from '../../core/ports/repositories/IUsuarioRepository.js';
import type { IClock } from '../../core/ports/services/IClock.js';
import { NotFoundError } from '../../core/errors/DomainError.js';
import type { PredeterminadosTicket } from '../../core/entities/ConfiguracionTickets.js';
import type { SessionUser } from '../shared/SessionUser.js';

/** Caso de uso: un usuario de staff fija su propia firma y encabezado para redactar tickets. */
export class ActualizarMiFirmaService {
  constructor(
    private readonly usuarios: IUsuarioRepository,
    private readonly clock: IClock,
  ) {}

  async ejecutar(input: {
    actor: SessionUser;
    firma: string;
    encabezado?: string;
    predeterminadosTicket?: PredeterminadosTicket;
  }): Promise<void> {
    const usuario = await this.usuarios.findByUid(input.actor.uid);
    if (!usuario) throw new NotFoundError('Usuario', input.actor.uid);

    const ahora = this.clock.now();
    usuario.fijarFirma(input.firma, ahora);
    if (input.encabezado !== undefined) usuario.fijarEncabezado(input.encabezado, ahora);
    if (input.predeterminadosTicket !== undefined) {
      const p = input.predeterminadosTicket;
      const algo = Object.values(p).some(Boolean);
      usuario.predeterminadosTicket = algo ? p : null;
      usuario.updatedAt = ahora;
    }
    await this.usuarios.save(usuario);
  }
}
