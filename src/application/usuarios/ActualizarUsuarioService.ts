import type { IUsuarioRepository } from '../../core/ports/repositories/IUsuarioRepository.js';
import type { IAuthProvider } from '../../core/ports/services/IAuthProvider.js';
import type { IClock } from '../../core/ports/services/IClock.js';
import type { ILogger } from '../../core/ports/services/ILogger.js';
import type { PerfilAgente } from '../../core/entities/Usuario.js';
import { parseRol, type Rol } from '../../core/entities/value-objects/Rol.js';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../core/errors/DomainError.js';
import type { SessionUser } from '../shared/SessionUser.js';

export interface ActualizarUsuarioInput {
  actor: SessionUser;
  uid: string;
  nombre?: string;
  rol?: Rol;
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

    const rolAnterior = usuario.rol;
    const dejaDeSerAdmin =
      rolAnterior === 'admin' && input.rol !== undefined && parseRol(input.rol) !== 'admin';
    const seDesactivaAdmin = rolAnterior === 'admin' && input.activo === false;
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
    if (input.rol !== undefined) usuario.rol = parseRol(input.rol);
    if (input.empresaId !== undefined) usuario.empresaId = input.empresaId || null;
    if (input.permisosExtra !== undefined) usuario.permisosExtra = [...new Set(input.permisosExtra)];
    if (input.permisosRevocados !== undefined) {
      usuario.permisosRevocados = [...new Set(input.permisosRevocados)];
    }
    if (input.agente !== undefined) usuario.agente = { ...usuario.agente, ...input.agente };

    if (usuario.rol === 'cliente' && !usuario.empresaId) {
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

    if (usuario.rol !== rolAnterior) {
      await this.auth.setRoleClaim(usuario.uid, usuario.rol);
    }
    // Cualquier cambio de rol/permisos/estado corta las sesiones activas: el usuario
    // vuelve a autenticarse y recalcula permisos.
    await this.auth.revokeSessions(usuario.uid);

    this.logger.info('Usuario actualizado', {
      uid: usuario.uid,
      por: input.actor.uid,
      rol: usuario.rol,
      activo: usuario.activo,
    });
  }
}
