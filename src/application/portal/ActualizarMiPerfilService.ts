import type { IUsuarioRepository } from '../../core/ports/repositories/IUsuarioRepository.js';
import type { IClock } from '../../core/ports/services/IClock.js';
import { NotFoundError, ValidationError } from '../../core/errors/DomainError.js';
import type { SessionUser } from '../shared/SessionUser.js';

/** Caso de uso: el cliente actualiza los datos de su propio perfil (hoy: solo el nombre). */
export class ActualizarMiPerfilService {
  constructor(
    private readonly usuarios: IUsuarioRepository,
    private readonly clock: IClock,
  ) {}

  async ejecutar(input: { actor: SessionUser; nombre: string }): Promise<void> {
    const usuario = await this.usuarios.findByUid(input.actor.uid);
    if (!usuario) throw new NotFoundError('Usuario', input.actor.uid);

    const nombre = input.nombre.trim();
    if (nombre.length < 2) throw new ValidationError('Escribe tu nombre', { nombre: 'Requerido' });

    usuario.nombre = nombre;
    usuario.updatedAt = this.clock.now();
    await this.usuarios.save(usuario);
  }
}
