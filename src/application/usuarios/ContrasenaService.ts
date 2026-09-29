import type { IUsuarioRepository } from '../../core/ports/repositories/IUsuarioRepository.js';
import type { IAuthProvider } from '../../core/ports/services/IAuthProvider.js';
import type { ILogger } from '../../core/ports/services/ILogger.js';
import { ForbiddenError, NotFoundError, UnauthorizedError, ValidationError } from '../../core/errors/DomainError.js';
import type { SessionUser } from '../shared/SessionUser.js';

/**
 * Largo mínimo de una contraseña: 6, como el CRM viejo (y el mínimo que acepta Firebase). Con 8
 * la pantalla bloqueaba contraseñas que el equipo ya usaba, sin decir por qué.
 */
export const MIN_PASSWORD = 6;
const MIN = MIN_PASSWORD;

/**
 * Traduce el rechazo de Firebase al guardar la contraseña (p. ej. una política de contraseñas
 * del proyecto) a un mensaje que se muestre en pantalla, en vez de un «No se pudo» sin causa.
 */
function motivoRechazo(err: unknown): string | null {
  const status = (err as { status?: unknown; code?: unknown } | null)?.status ?? (err as { code?: unknown } | null)?.code;
  const texto = `${typeof status === 'string' ? status : ''} ${err instanceof Error ? err.message : ''}`;
  if (/WEAK_PASSWORD|invalid-password/i.test(texto)) return `Firebase la considera muy débil: usa al menos ${MIN} caracteres.`;
  if (/PASSWORD_DOES_NOT_MEET_REQUIREMENTS/i.test(texto)) {
    const reqs = /\[([^\]]+)\]/.exec(texto)?.[1];
    return `No cumple la política de contraseñas del proyecto${reqs ? `: ${reqs}` : ''}.`;
  }
  if (/CREDENTIAL_TOO_OLD|TOKEN_EXPIRED|requires-recent-login/i.test(texto)) {
    return 'Tu sesión es muy antigua para este cambio: sal, vuelve a entrar e inténtalo de nuevo.';
  }
  return null;
}

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
    await this.guardar(input.actor.uid, input.password);
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
    await this.guardar(usuario.uid, input.password);
    await this.auth.revokeSessions(usuario.uid);
    this.logger.info('Contraseña restablecida por admin', { uid: usuario.uid, por: input.actor.uid });
  }

  private async guardar(uid: string, password: string): Promise<void> {
    try {
      await this.auth.setPassword(uid, password);
    } catch (err) {
      this.logger.warn('Firebase rechazó el cambio de contraseña', {
        uid,
        err: err instanceof Error ? err.message : String(err),
      });
      const motivo = motivoRechazo(err);
      throw new ValidationError(
        motivo ?? 'Firebase no aceptó el cambio de contraseña. Inténtalo de nuevo; si sigue, avisa al administrador.',
        { general: motivo ?? 'No se pudo guardar en Firebase' },
      );
    }
  }
}
