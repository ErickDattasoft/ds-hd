import type { BitacoraService } from '../shared/BitacoraService.js';
import type { IUsuarioRepository } from '../../core/ports/repositories/IUsuarioRepository.js';
import type { ITicketQueries } from '../../core/ports/repositories/ITicketQueries.js';
import type { IAuthProvider } from '../../core/ports/services/IAuthProvider.js';
import type { ILogger } from '../../core/ports/services/ILogger.js';
import type { SessionUser } from '../shared/SessionUser.js';
import { ConflictError, ForbiddenError, NotFoundError } from '../../core/errors/DomainError.js';

/**
 * Caso de uso: eliminar un usuario para siempre (cuenta de acceso + `usuarios/{uid}`).
 * Los tickets guardan el nombre del agente, así que el historial no pierde a quién lo atendió;
 * aun así, se exige reasignar antes los tickets abiertos para no dejarlos sin responsable.
 */
export class EliminarUsuarioService {
  constructor(
    private readonly usuarios: IUsuarioRepository,
    private readonly auth: IAuthProvider,
    private readonly tickets: ITicketQueries,
    private readonly logger: ILogger,
    private readonly bitacora?: BitacoraService,
  ) {}

  async ejecutar(input: { actor: SessionUser; uid: string }): Promise<{ nombre: string }> {
    const usuario = await this.usuarios.findByUid(input.uid);
    if (!usuario) throw new NotFoundError('Usuario', input.uid);
    if (input.uid === input.actor.uid) throw new ForbiddenError('No puedes eliminar tu propia cuenta');
    if (usuario.tieneRol('admin') && (await this.usuarios.countByRol('admin')) <= 1) {
      throw new ConflictError('No puedes eliminar al último administrador del sistema');
    }
    const abiertos = await this.tickets.contar({ agenteAsignadoUid: usuario.uid, soloAbiertos: true });
    if (abiertos > 0) {
      throw new ConflictError(
        `${usuario.nombre} tiene ${abiertos} ticket${abiertos === 1 ? '' : 's'} abierto${abiertos === 1 ? '' : 's'} asignado${abiertos === 1 ? '' : 's'}: reasígnalos antes de eliminarlo`,
      );
    }

    // Primero la cuenta de acceso: si falla, el usuario sigue completo y se puede reintentar.
    await this.auth.deleteAccount(usuario.uid);
    await this.usuarios.delete(usuario.uid);

    await this.bitacora?.registrar({
      actor: input.actor,
      accion: 'eliminar',
      modulo: 'usuarios',
      entidadTipo: 'Usuario',
      entidadId: usuario.uid,
      resumen: `Usuario eliminado: ${usuario.nombre} (${usuario.email.value})`,
    });
    this.logger.info('Usuario eliminado', { uid: usuario.uid, por: input.actor.uid });
    return { nombre: usuario.nombre };
  }
}
