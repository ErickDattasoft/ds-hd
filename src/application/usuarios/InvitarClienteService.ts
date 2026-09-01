import type { IUsuarioRepository } from '../../core/ports/repositories/IUsuarioRepository.js';
import type { IInvitacionRepository } from '../../core/ports/repositories/IInvitacionRepository.js';
import type { IAuthProvider } from '../../core/ports/services/IAuthProvider.js';
import type { IEmailSender } from '../../core/ports/services/IEmailSender.js';
import type { IIdGenerator } from '../../core/ports/services/IIdGenerator.js';
import type { IClock } from '../../core/ports/services/IClock.js';
import type { ILogger } from '../../core/ports/services/ILogger.js';
import { Usuario } from '../../core/entities/Usuario.js';
import { Email } from '../../core/entities/value-objects/Email.js';
import { ConflictError, ValidationError } from '../../core/errors/DomainError.js';
import type { SessionUser } from '../shared/SessionUser.js';

export interface InvitarClienteInput {
  actor: SessionUser;
  email: string;
  nombre: string;
  /** Empresa a la que queda vinculado el cliente. Obligatoria. */
  empresaId: string;
}

export interface InvitarClienteResultado {
  usuario: Usuario;
  urlInvitacion: string;
}

/**
 * Caso de uso: el staff invita a un contacto de una empresa a usar el portal de clientes.
 * Crea la identidad, el documento `usuarios/{uid}` con rol `cliente` vinculado a la empresa,
 * y una invitación de un solo uso para que fije su contraseña.
 */
export class InvitarClienteService {
  constructor(
    private readonly usuarios: IUsuarioRepository,
    private readonly invitaciones: IInvitacionRepository,
    private readonly auth: IAuthProvider,
    private readonly email: IEmailSender,
    private readonly ids: IIdGenerator,
    private readonly clock: IClock,
    private readonly logger: ILogger,
    private readonly baseUrl: string,
    private readonly invitacionTtlHoras: number,
  ) {}

  async ejecutar(input: InvitarClienteInput): Promise<InvitarClienteResultado> {
    const correo = Email.create(input.email);
    const nombre = input.nombre.trim();
    if (nombre.length < 2) throw new ValidationError('Escribe el nombre', { nombre: 'Requerido' });
    if (!input.empresaId) {
      throw new ValidationError('Selecciona la empresa del cliente', { empresaId: 'Requerido' });
    }

    if (await this.usuarios.findByEmail(correo.value)) {
      throw new ConflictError(`Ya existe una cuenta con el correo ${correo.value}`);
    }

    const { uid } = await this.auth.createAccount({
      email: correo.value,
      password: this.ids.newToken(),
      nombre,
    });
    await this.auth.setRoleClaim(uid, 'cliente');

    const usuario = new Usuario({
      uid,
      email: correo.value,
      nombre,
      rol: 'cliente',
      empresaId: input.empresaId,
      createdAt: this.clock.now(),
    });
    await this.usuarios.save(usuario);

    const token = this.ids.newToken();
    const ahora = this.clock.now();
    await this.invitaciones.create({
      token,
      uid,
      email: correo.value,
      invitadoPor: input.actor.uid,
      createdAt: ahora,
      expiresAt: new Date(ahora.getTime() + this.invitacionTtlHoras * 3600_000),
    });
    const urlInvitacion = `${this.baseUrl}/invitacion/${token}`;

    await this.email.enviar({
      para: [{ email: correo.value, nombre }],
      asunto: 'Acceso al portal de soporte DATTASOFT',
      html: `<p>Hola ${nombre}, te damos acceso al portal donde podrás crear y dar seguimiento a tus tickets.</p>
             <p><a href="${urlInvitacion}">Establece tu contraseña aquí</a> (expira en ${this.invitacionTtlHoras} h).</p>`,
      tags: ['invitacion-cliente'],
    });

    this.logger.info('Cliente invitado al portal', { uid, empresaId: input.empresaId, por: input.actor.uid });
    return { usuario, urlInvitacion };
  }
}
