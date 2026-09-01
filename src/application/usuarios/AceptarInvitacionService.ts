import type { IInvitacionRepository } from '../../core/ports/repositories/IInvitacionRepository.js';
import type { IUsuarioRepository } from '../../core/ports/repositories/IUsuarioRepository.js';
import type { IAuthProvider } from '../../core/ports/services/IAuthProvider.js';
import type { IClock } from '../../core/ports/services/IClock.js';
import type { ILogger } from '../../core/ports/services/ILogger.js';
import { NotFoundError, ValidationError } from '../../core/errors/DomainError.js';

export interface AceptarInvitacionInput {
  token: string;
  password: string;
  passwordConfirmacion: string;
}

/** Caso de uso: el invitado abre el enlace y fija su contraseña. */
export class AceptarInvitacionService {
  constructor(
    private readonly invitaciones: IInvitacionRepository,
    private readonly usuarios: IUsuarioRepository,
    private readonly auth: IAuthProvider,
    private readonly clock: IClock,
    private readonly logger: ILogger,
  ) {}

  async ejecutar(input: AceptarInvitacionInput): Promise<{ email: string }> {
    const invitacion = await this.invitaciones.findByToken(input.token);
    if (!invitacion) throw new NotFoundError('Invitación');

    const ahora = this.clock.now();
    if (invitacion.usadaEn) throw new ValidationError('Esta invitación ya fue utilizada');
    if (invitacion.expiresAt.getTime() < ahora.getTime()) {
      throw new ValidationError('La invitación expiró. Pide una nueva.');
    }

    if (input.password.length < 8) {
      throw new ValidationError('La contraseña debe tener al menos 8 caracteres', {
        password: 'Mínimo 8 caracteres',
      });
    }
    if (input.password !== input.passwordConfirmacion) {
      throw new ValidationError('Las contraseñas no coinciden', {
        passwordConfirmacion: 'No coincide',
      });
    }

    const usuario = await this.usuarios.findByUid(invitacion.uid);
    if (!usuario) throw new NotFoundError('Usuario', invitacion.uid);

    await this.auth.setPassword(invitacion.uid, input.password);
    await this.auth.setDisabled(invitacion.uid, false);
    if (!usuario.activo) {
      usuario.activar();
      await this.usuarios.save(usuario);
    }
    await this.invitaciones.marcarUsada(input.token, ahora);

    this.logger.info('Invitación aceptada', { uid: invitacion.uid });
    return { email: invitacion.email };
  }
}
