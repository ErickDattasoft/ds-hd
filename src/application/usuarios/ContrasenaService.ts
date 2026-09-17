import type { IUsuarioRepository } from '../../core/ports/repositories/IUsuarioRepository.js';
import type { IAuthProvider } from '../../core/ports/services/IAuthProvider.js';
import type { ILogger } from '../../core/ports/services/ILogger.js';
import { ForbiddenError, NotFoundError, UnauthorizedError, ValidationError } from '../../core/errors/DomainError.js';
import type { SessionUser } from '../shared/SessionUser.js';

const MIN = 8;

/** Valida largo mínimo y confirmación de la contraseña nueva. */
function validarNueva(password: string, confirmacion: string): void {
  if (password.length < MIN) {
    throw new ValidationError('Contraseña inválida', { password: `Mínimo ${MIN} caracteres` });
  }
  if (password !== confirmacion) {
    throw new ValidationError('Contraseña inválida', { passwordConfirmacion: 'No coincide' });
  }
}

/** Casos de uso de contraseña: cambiar la propia y restablecer la de otro (admin). */
export class ContrasenaService {
  constructor(
    private readonly usuarios: IUsuarioRepository,
    private readonly auth: IAuthProvider,
    private readonly logger: ILogger,
  ) {}

  /** El usuario cambia su contraseña confirmando la actual. */
  async cambiarMia(input: {
    actor: SessionUser;
    actual: string;
    password: string;
    passwordConfirmacion: string;
  }): Promise<void> {
    validarNueva(input.password, input.passwordConfirmacion);
    try {
      await this.auth.verifyPassword(input.actor.email, input.actual);
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        throw new ValidationError('Contraseña actual incorrecta', { actual: 'Incorrecta' });
      }
      throw err;
    }
    await this.auth.setPassword(input.actor.uid, input.password);
    this.logger.info('Contraseña cambiada por el usuario', { uid: input.actor.uid });
  }

  /** Un administrador fija una contraseña nueva a otro usuario y corta sus sesiones. */
  async restablecer(input: {
    actor: SessionUser;
    uid: string;
    password: string;
    passwordConfirmacion: string;
  }): Promise<void> {
    if (!input.actor.permisos.includes('usuarios:gestionar')) {
      throw new ForbiddenError('No puedes restablecer contraseñas');
    }
    const usuario = await this.usuarios.findByUid(input.uid);
    if (!usuario) throw new NotFoundError('Usuario', input.uid);
    validarNueva(input.password, input.passwordConfirmacion);
    await this.auth.setPassword(usuario.uid, input.password);
    await this.auth.revokeSessions(usuario.uid);
    this.logger.info('Contraseña restablecida por admin', { uid: usuario.uid, por: input.actor.uid });
  }
}
