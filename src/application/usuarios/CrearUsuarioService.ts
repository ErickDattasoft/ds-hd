import type { IUsuarioRepository } from '../../core/ports/repositories/IUsuarioRepository.js';
import type { IInvitacionRepository } from '../../core/ports/repositories/IInvitacionRepository.js';
import type { IAuthProvider } from '../../core/ports/services/IAuthProvider.js';
import type { IEmailSender } from '../../core/ports/services/IEmailSender.js';
import type { IIdGenerator } from '../../core/ports/services/IIdGenerator.js';
import type { IClock } from '../../core/ports/services/IClock.js';
import type { ILogger } from '../../core/ports/services/ILogger.js';
import { Usuario, type PerfilAgente } from '../../core/entities/Usuario.js';
import { Email } from '../../core/entities/value-objects/Email.js';
import { esRolStaff, parseRoles, type Rol } from '../../core/entities/value-objects/Rol.js';
import { ConflictError, ValidationError } from '../../core/errors/DomainError.js';
import type { SessionUser } from '../shared/SessionUser.js';

/** Datos para dar de alta una cuenta de staff. */
export interface CrearUsuarioInput {
  actor: SessionUser;
  email: string;
  nombre: string;
  /** Uno o varios roles de staff. */
  roles: Rol[];
  agente?: Partial<PerfilAgente>;
}

/** Resultado del alta: el usuario creado y el link para que fije su contraseña. */
export interface CrearUsuarioResultado {
  usuario: Usuario;
  /** URL de un solo uso para que el usuario fije su contraseña. */
  urlInvitacion: string;
}

/** Caso de uso: un administrador da de alta una cuenta de staff. */
export class CrearUsuarioService {
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

  async ejecutar(input: CrearUsuarioInput): Promise<CrearUsuarioResultado> {
    const roles = parseRoles(input.roles);
    if (!roles.every(esRolStaff)) {
      throw new ValidationError('Para clientes usa la invitación al portal', {
        roles: 'Este flujo es solo para personal',
      });
    }
    const correo = Email.create(input.email);
    const nombre = input.nombre.trim();
    if (nombre.length < 2) throw new ValidationError('Escribe el nombre', { nombre: 'Requerido' });

    if (await this.usuarios.findByEmail(correo.value)) {
      throw new ConflictError(`Ya existe un usuario con el correo ${correo.value}`);
    }

    const passwordTemporal = this.ids.newToken();
    const { uid } = await this.auth.createAccount({
      email: correo.value,
      password: passwordTemporal,
      nombre,
    });
    await this.auth.setRolesClaim(uid, roles);

    const usuario = new Usuario({
      uid,
      email: correo.value,
      nombre,
      roles,
      ...(input.agente ? { agente: input.agente } : {}),
      createdAt: this.clock.now(),
    });
    await this.usuarios.save(usuario);

    const urlInvitacion = await this.crearInvitacion(uid, correo.value, input.actor.uid);

    await this.email.enviar({
      para: [{ email: correo.value, nombre }],
      asunto: 'Tu acceso a ds-hd',
      html: `<p>Hola ${nombre}, se creó tu cuenta.</p>
             <p><a href="${urlInvitacion}">Haz clic aquí para establecer tu contraseña</a> (expira en ${this.invitacionTtlHoras} h).</p>`,
      tags: ['invitacion-staff'],
    });

    this.logger.info('Usuario staff creado', { uid, roles, por: input.actor.uid });
    return { usuario, urlInvitacion };
  }

  private async crearInvitacion(uid: string, email: string, invitadoPor: string): Promise<string> {
    const token = this.ids.newToken();
    const ahora = this.clock.now();
    await this.invitaciones.create({
      token,
      uid,
      email,
      invitadoPor,
      createdAt: ahora,
      expiresAt: new Date(ahora.getTime() + this.invitacionTtlHoras * 3600_000),
    });
    return `${this.baseUrl}/invitacion/${token}`;
  }
}
