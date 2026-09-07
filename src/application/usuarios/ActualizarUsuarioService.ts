import type { IUsuarioRepository } from '../../core/ports/repositories/IUsuarioRepository.js';
import type { IAuthProvider } from '../../core/ports/services/IAuthProvider.js';
import type { IClock } from '../../core/ports/services/IClock.js';
import type { ILogger } from '../../core/ports/services/ILogger.js';
import type { PerfilAgente } from '../../core/entities/Usuario.js';
import { parseRoles, type Rol } from '../../core/entities/value-objects/Rol.js';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../core/errors/DomainError.js';
import type { SessionUser } from '../shared/SessionUser.js';

/** Campos editables de un usuario; todos opcionales salvo `uid` (solo se aplica lo enviado). */
export interface ActualizarUsuarioInput {
  actor: SessionUser;
  uid: string;
  nombre?: string;
  /** Conjunto completo de roles a asignar (reemplaza los actuales). */
  roles?: Rol[];
  activo?: boolean;
  empresaId?: string | null;
  permisosExtra?: string[];
  permisosRevocados?: string[];
  agente?: Partial<PerfilAgente>;
}

/** Caso de uso: editar nombre, rol, estado, permisos y perfil de agente de un usuario. */
export class ActualizarUsuarioService {
  constructor(
    private readonly usuarios: IUsuarioRepository,
    private readonly auth: IAuthProvider,
    private readonly clock: IClock,
    private readonly logger: ILogger,
  ) {}

  async ejecutar(input: ActualizarUsuarioInput): Promise<void> {
    const usuario = await this.usuarios.findByUid(input.uid);
    if (!usuario) throw new NotFoundError('Usuario', input.uid);

    const rolesAnteriores = [...usuario.roles];
    const rolesNuevos = input.roles !== undefined ? parseRoles(input.roles) : null;
    const eraAdmin = usuario.tieneRol('admin');
    const dejaDeSerAdmin = eraAdmin && rolesNuevos !== null && !rolesNuevos.includes('admin');
    const seDesactivaAdmin = eraAdmin && input.activo === false;
    if (dejaDeSerAdmin || seDesactivaAdmin) {
      const admins = await this.usuarios.countByRol('admin');
      if (admins <= 1) {
        throw new ConflictError('No puedes quitar al último administrador del sistema');
      }
    }
    if (input.uid === input.actor.uid && (input.activo === false || dejaDeSerAdmin)) {
      throw new ForbiddenError('No puedes desactivarte ni degradar tu propia cuenta');
    }

    if (input.nombre !== undefined) {
      const n = input.nombre.trim();
      if (n.length < 2) throw new ValidationError('Nombre inválido', { nombre: 'Requerido' });
      usuario.nombre = n;
    }
    if (rolesNuevos !== null) usuario.cambiarRoles(rolesNuevos, this.clock.now());
    if (input.empresaId !== undefined) usuario.empresaId = input.empresaId || null;
    if (input.permisosExtra !== undefined) usuario.permisosExtra = [...new Set(input.permisosExtra)];
    if (input.permisosRevocados !== undefined) {
      usuario.permisosRevocados = [...new Set(input.permisosRevocados)];
    }
    if (input.agente !== undefined) usuario.agente = { ...usuario.agente, ...input.agente };

    if (usuario.esCliente && !usuario.empresaId) {
      throw new ValidationError('Un cliente debe tener empresa asociada', {
        empresaId: 'Requerido para rol cliente',
      });
    }

    if (input.activo !== undefined && input.activo !== usuario.activo) {
      if (input.activo) usuario.activar();
      else usuario.desactivar();
      await this.auth.setDisabled(usuario.uid, !input.activo);
    }

    usuario.updatedAt = this.clock.now();
    await this.usuarios.save(usuario);

    const rolesCambiaron =
      rolesAnteriores.length !== usuario.roles.length ||
      !rolesAnteriores.every((r) => usuario.roles.includes(r));
    if (rolesCambiaron) {
      await this.auth.setRolesClaim(usuario.uid, usuario.roles);
    }
    // Cualquier cambio de rol/permisos/estado corta las sesiones activas: el usuario
    // vuelve a autenticarse y recalcula permisos.
    await this.auth.revokeSessions(usuario.uid);

    this.logger.info('Usuario actualizado', {
      uid: usuario.uid,
      por: input.actor.uid,
      roles: usuario.roles,
      activo: usuario.activo,
    });
  }
}
