import type { ITicketQueries, CargaAgente } from '../../core/ports/repositories/ITicketQueries.js';
import type { IUsuarioRepository } from '../../core/ports/repositories/IUsuarioRepository.js';
import type { IClock } from '../../core/ports/services/IClock.js';
import { ROLES_TECNICOS } from '../../core/entities/value-objects/Rol.js';

/** Caso de uso: panel de carga de trabajo por agente (para decidir asignaciones). */
export class PanelCargaAgentesService {
  constructor(
    private readonly queries: ITicketQueries,
    private readonly usuarios: IUsuarioRepository,
    private readonly clock: IClock,
  ) {}

  async ejecutar(): Promise<CargaAgente[]> {
    const agentes = await this.usuarios.list({ roles: ROLES_TECNICOS });
    const carga = await this.queries.cargaPorAgente(
      agentes.map((a) => ({
        uid: a.uid,
        nombre: a.nombre,
        grupo: a.agente.grupo,
        capacidadMax: a.agente.capacidadMax,
        disponibleAsignacion: a.agente.disponibleAsignacion,
      })),
      this.clock.now(),
    );
    return carga.sort((a, b) => b.abiertos - a.abiertos);
  }
}
