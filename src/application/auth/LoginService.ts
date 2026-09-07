import type { IUsuarioRepository } from '../../core/ports/repositories/IUsuarioRepository.js';
import type { IIntentosLoginRepository } from '../../core/ports/repositories/IIntentosLoginRepository.js';
import type { IAuthProvider } from '../../core/ports/services/IAuthProvider.js';
import type { ISessionManager } from '../../core/ports/services/ISessionManager.js';
import type { IClock } from '../../core/ports/services/IClock.js';
import type { ILogger } from '../../core/ports/services/ILogger.js';
import type { Usuario } from '../../core/entities/Usuario.js';
import { UnauthorizedError } from '../../core/errors/DomainError.js';

/** Minutos que faltan (redondeado hacia arriba, mínimo 1) para que expire un bloqueo. */
function minutosRestantes(hasta: Date, ahora: Date): number {
  return Math.max(1, Math.ceil((hasta.getTime() - ahora.getTime()) / 60000));
}

/** Credenciales enviadas desde el formulario de login. */
export interface LoginInput {
  email: string;
  password: string;
}

/** Resultado de un login exitoso: sesión emitida más el usuario autenticado. */
export interface LoginResultado {
  /** Valor para la cookie de sesión. */
  token: string;
  usuario: Usuario;
}

/** Caso de uso: iniciar sesión con correo y contraseña. */
export class LoginService {
  constructor(
    private readonly usuarios: IUsuarioRepository,
    private readonly auth: IAuthProvider,
    private readonly sesiones: ISessionManager,
    private readonly clock: IClock,
    private readonly logger: ILogger,
    private readonly intentos: IIntentosLoginRepository,
  ) {}

  async ejecutar(input: LoginInput): Promise<LoginResultado> {
    const email = input.email.trim().toLowerCase();
    const ahora = this.clock.now();

    // Mensaje genérico para no revelar si el correo existe.
    const credencialesInvalidas = new UnauthorizedError('Correo o contraseña incorrectos');

    const previo = await this.intentos.consultar(email, ahora);
    if (previo.bloqueadoHasta) {
      throw new UnauthorizedError(
        `Demasiados intentos fallidos. Vuelve a intentar en ${minutosRestantes(previo.bloqueadoHasta, ahora)} min.`,
      );
    }

    let verificado;
    try {
      verificado = await this.auth.verifyPassword(email, input.password);
    } catch {
      const estado = await this.intentos.registrarFallo(email, ahora);
      if (estado.bloqueadoHasta) {
        this.logger.warn('Login: correo bloqueado por intentos fallidos', { email });
        throw new UnauthorizedError(
          `Demasiados intentos fallidos. Vuelve a intentar en ${minutosRestantes(estado.bloqueadoHasta, ahora)} min.`,
        );
      }
      throw credencialesInvalidas;
    }

    const usuario = await this.usuarios.findByUid(verificado.uid);
    if (!usuario) {
      this.logger.warn('Login: identidad válida sin documento de usuario', { uid: verificado.uid });
      throw credencialesInvalidas;
    }
    if (!usuario.activo) {
      throw new UnauthorizedError('Tu cuenta está desactivada. Contacta a un administrador.');
    }

    await this.intentos.limpiar(email);
    usuario.registrarAcceso(ahora);
    await this.usuarios.save(usuario);

    const token = await this.sesiones.issue({ uid: usuario.uid });
    this.logger.info('Login correcto', { uid: usuario.uid, rol: usuario.rol });
    return { token, usuario };
  }
}
