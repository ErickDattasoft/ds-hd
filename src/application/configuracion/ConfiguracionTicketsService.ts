import type { IConfiguracionRepository } from '../../core/ports/repositories/IConfiguracionRepository.js';
import type { ILogger } from '../../core/ports/services/ILogger.js';
import type { ConfiguracionTickets } from '../../core/entities/ConfiguracionTickets.js';
import type { PredeterminadosTicket } from '../../core/entities/ConfiguracionTickets.js';
import { CONFIG_TICKETS_POR_DEFECTO, distribuidoresDe, parsearRespuestas } from '../../core/entities/ConfiguracionTickets.js';
import { ForbiddenError, ValidationError } from '../../core/errors/DomainError.js';
import type { SessionUser } from '../shared/SessionUser.js';
import type { IUsuarioRepository } from '../../core/ports/repositories/IUsuarioRepository.js';
import { ROLES_ASIGNABLES } from '../../core/entities/value-objects/Rol.js';
import type { ITicketRepository } from '../../core/ports/repositories/ITicketRepository.js';
import { valorFacturacion } from '../../core/entities/value-objects/EstadoFacturacion.js';

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
    private readonly usuarios?: IUsuarioRepository,
    private readonly tickets?: ITicketRepository,
  ) {}

  /** Quiénes pueden ser el agente predeterminado (los mismos que se pueden asignar a un ticket). */
  async agentesAsignables(): Promise<{ uid: string; nombre: string }[]> {
    if (!this.usuarios) return [];
    const lista = await this.usuarios.list({ roles: ROLES_ASIGNABLES, activo: true }).catch(() => []);
    return lista.map((u) => ({ uid: u.uid, nombre: u.nombre }));
  }

  obtener(): Promise<ConfiguracionTickets> {
    return this.repo.obtenerTickets();
  }

  async actualizar(input: {
    actor: SessionUser;
    tipos: string;
    sistemas: string;
    grupos: string;
    /** Un distribuidor por línea; DATTASOFT se agrega solo si falta. */
    distribuidores?: string;
    estados: string;
    prioridades: string;
    tiposFacturables: string;
    /** Estados de facturación, uno por línea. */
    facturacion?: string;
    estadoInicial: string;
    correosNotificacion: string;
    slaHoras: Record<string, string | number>;
    predeterminados?: PredeterminadosTicket;
    respuestas?: string;
    /** Estados marcados para avisar al cliente. */
    avisarClienteEstados?: string[];
    /** Estados renombrados en su renglón (nombre anterior → nuevo): los tickets que lo tienen se pasan al nuevo. */
    renombresEstados?: Record<string, string>;
  }): Promise<{ ticketsRenombrados: number }> {
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
      // Solo estados que existan en el flujo; resuelto/cerrado ya avisan por su cuenta.
      avisarClienteEstados: (input.avisarClienteEstados ?? []).filter((e) => estados.includes(e)),
    };
    config.distribuidores =
      input.distribuidores !== undefined
        ? distribuidoresDe({ distribuidores: listaLimpia(input.distribuidores) })
        : distribuidoresDe(await this.repo.obtenerTickets());
    if (input.facturacion !== undefined) {
      const lista = listaLimpia(input.facturacion).map((t) => t.slice(0, 60));
      if (!lista.length) throw new ValidationError('Deja al menos un estado de facturación', { facturacion: 'Vacío' });
      config.facturacion = lista;
    } else {
      const previa = (await this.repo.obtenerTickets()).facturacion;
      if (previa) config.facturacion = previa;
    }
    if (input.respuestas !== undefined) config.respuestas = parsearRespuestas(input.respuestas);
    else config.respuestas = (await this.repo.obtenerTickets()).respuestas ?? [];
    if (input.predeterminados) {
      const p = input.predeterminados;
      // Un predeterminado que ya no está en su catálogo se descarta en silencio.
      const en = (v: string | undefined, lista: string[]): string => (v && lista.includes(v) ? v : '');
      config.predeterminados = {
        tipo: en(p.tipo, config.tipos),
        prioridad: en(p.prioridad, prioridades),
        sistema: en(p.sistema, config.sistemas),
        grupo: en(p.grupo, config.grupos),
        // La ★ de la tarjeta manda el texto; se guarda su valor (clave de fábrica o el texto).
        estadoFacturacion: p.estadoFacturacion ? valorFacturacion(p.estadoFacturacion) : '',
        asignarAlCreador: Boolean(p.asignarAlCreador),
        agenteUid: (p.agenteUid ?? '').trim(),
      };
    }
    await this.repo.guardarTickets(config);
    let ticketsRenombrados = 0;
    if (this.tickets) {
      for (const [viejo, nuevo] of Object.entries(input.renombresEstados ?? {})) {
        // Solo si de verdad cambió de nombre: el viejo ya no está y el nuevo sí.
        if (!viejo || viejo === nuevo || estados.includes(viejo) || !estados.includes(nuevo)) continue;
        ticketsRenombrados += await this.tickets.renombrarEstado(viejo, nuevo);
      }
    }
    this.logger.info('Configuración de tickets actualizada', { por: input.actor.uid, ticketsRenombrados });
    return { ticketsRenombrados };
  }
}
