import type { IConfiguracionRepository } from '../../core/ports/repositories/IConfiguracionRepository.js';
import type { ILogger } from '../../core/ports/services/ILogger.js';
import type { ConfiguracionTickets } from '../../core/entities/ConfiguracionTickets.js';
import { CONFIG_TICKETS_POR_DEFECTO } from '../../core/entities/ConfiguracionTickets.js';
import { ForbiddenError, ValidationError } from '../../core/errors/DomainError.js';
import type { SessionUser } from '../shared/SessionUser.js';

const listaLimpia = (v: unknown): string[] =>
  String(v ?? '')
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

/** Casos de uso: leer y actualizar los catálogos del módulo de tickets. */
export class ConfiguracionTicketsService {
  constructor(
    private readonly repo: IConfiguracionRepository,
    private readonly logger: ILogger,
  ) {}

  obtener(): Promise<ConfiguracionTickets> {
    return this.repo.obtenerTickets();
  }

  async actualizar(input: {
    actor: SessionUser;
    tipos: string;
    sistemas: string;
    grupos: string;
    estados: string;
    prioridades: string;
    tiposFacturables: string;
    estadoInicial: string;
    correosNotificacion: string;
    slaHoras: Record<string, string | number>;
  }): Promise<void> {
    if (!input.actor.permisos.includes('configuracion:catalogos')) {
      throw new ForbiddenError('No puedes editar la configuración');
    }

    const estados = listaLimpia(input.estados);
    const prioridades = listaLimpia(input.prioridades);
    if (estados.length < 2) throw new ValidationError('Define al menos 2 estados', { estados: 'Muy pocos' });
    if (!estados.includes(input.estadoInicial)) {
      throw new ValidationError('El estado inicial debe estar en la lista de estados', {
        estadoInicial: 'No está en la lista',
      });
    }

    const slaHoras: Record<string, number> = {};
    for (const p of prioridades) {
      const n = Number(input.slaHoras[p]);
      slaHoras[p] = Number.isFinite(n) && n > 0 ? n : (CONFIG_TICKETS_POR_DEFECTO.slaHoras[p] ?? 24);
    }

    const config: ConfiguracionTickets = {
      tipos: listaLimpia(input.tipos),
      sistemas: listaLimpia(input.sistemas),
      grupos: listaLimpia(input.grupos),
      estados,
      prioridades,
      slaHoras,
      tiposFacturables: listaLimpia(input.tiposFacturables),
      estadoInicial: input.estadoInicial,
      correosNotificacion: listaLimpia(input.correosNotificacion),
    };
    await this.repo.guardarTickets(config);
    this.logger.info('Configuración de tickets actualizada', { por: input.actor.uid });
  }
}
