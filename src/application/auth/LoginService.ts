import type { IUsuarioRepository } from '../../core/ports/repositories/IUsuarioRepository.js';
import type { IAuthProvider } from '../../core/ports/services/IAuthProvider.js';
import type { ISessionManager } from '../../core/ports/services/ISessionManager.js';
import type { IClock } from '../../core/ports/services/IClock.js';
import type { ILogger } from '../../core/ports/services/ILogger.js';
import type { Usuario } from '../../core/entities/Usuario.js';
import { UnauthorizedError } from '../../core/errors/DomainError.js';

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
  ) {}

  async ejecutar(input: LoginInput): Promise<LoginResultado> {
    const email = input.email.trim().toLowerCase();

    // Mensaje genérico para no revelar si el correo existe.
    const credencialesInvalidas = new UnauthorizedError('Correo o contraseña incorrectos');

    let verificado;
    try {
      verificado = await this.auth.verifyPassword(email, input.password);
    } catch {
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

    usuario.registrarAcceso(this.clock.now());
    await this.usuarios.save(usuario);

    const token = await this.sesiones.issue({ uid: usuario.uid });
    this.logger.info('Login correcto', { uid: usuario.uid, rol: usuario.rol });
    return { token, usuario };
  }
}
