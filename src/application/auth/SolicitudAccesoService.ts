import type { ISolicitudAccesoRepository, SolicitudAcceso } from '../../core/ports/repositories/ISolicitudAccesoRepository.js';
import { ForbiddenError, NotFoundError } from '../../core/errors/DomainError.js';
import type { BitacoraService } from '../shared/BitacoraService.js';
import type { SessionUser } from '../shared/SessionUser.js';

/** Gestión (staff) de las solicitudes de acceso pendientes — aprobar/rechazar. */
export class SolicitudAccesoService {
  constructor(
    private readonly repo: ISolicitudAccesoRepository,
    private readonly bitacora: BitacoraService,
  ) {}

  listarPendientes(actor: SessionUser): Promise<SolicitudAcceso[]> {
    if (!actor.permisos.includes('usuarios:gestionar')) {
      throw new ForbiddenError('No puedes ver solicitudes de acceso');
    }
    return this.repo.listPendientes();
  }

  aprobar(actor: SessionUser, id: string): Promise<SolicitudAcceso> {
    return this.cambiarEstado(actor, id, 'aprobada');
  }

  rechazar(actor: SessionUser, id: string): Promise<SolicitudAcceso> {
    return this.cambiarEstado(actor, id, 'rechazada');
  }

  private async cambiarEstado(
    actor: SessionUser,
    id: string,
    estado: 'aprobada' | 'rechazada',
  ): Promise<SolicitudAcceso> {
    if (!actor.permisos.includes('usuarios:gestionar')) {
      throw new ForbiddenError('No puedes gestionar solicitudes de acceso');
    }
    const solicitud = (await this.repo.listPendientes()).find((s) => s.id === id);
    if (!solicitud) throw new NotFoundError('Solicitud de acceso', id);
    await this.repo.updateEstado(id, estado);
    await this.bitacora.registrar({
      actor,
      accion: estado === 'aprobada' ? 'aprobar' : 'rechazar',
      modulo: 'solicitudes_acceso',
      entidadTipo: 'SolicitudAcceso',
      entidadId: id,
      resumen: `Solicitud de ${solicitud.nombre} (${solicitud.email}) ${estado}`,
    });
    return { ...solicitud, estado };
  }
}
