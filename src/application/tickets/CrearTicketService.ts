import type { ITicketRepository } from '../../core/ports/repositories/ITicketRepository.js';
import type { IContadorRepository } from '../../core/ports/repositories/IContadorRepository.js';
import type { IConfiguracionRepository } from '../../core/ports/repositories/IConfiguracionRepository.js';
import type { IClock } from '../../core/ports/services/IClock.js';
import type { IIdGenerator } from '../../core/ports/services/IIdGenerator.js';
import type { ILogger } from '../../core/ports/services/ILogger.js';
import type { IWebhookPublisher } from '../../core/ports/services/IWebhookPublisher.js';
import { Ticket } from '../../core/entities/Ticket.js';
import { horasSlaDe } from '../../core/entities/ConfiguracionTickets.js';
import { parsePrioridad } from '../../core/entities/value-objects/Prioridad.js';
import { esRolTecnico } from '../../core/entities/value-objects/Rol.js';
import { ValidationError } from '../../core/errors/DomainError.js';
import { CONTADOR_TICKETS } from './constantes.js';
import { registrarEvento } from './efectos.js';
import type { CrearTicketInput } from './dto.js';

/** Caso de uso: crear un ticket (interno, portal o al aceptar uno público). */
export class CrearTicketService {
  constructor(
    private readonly tickets: ITicketRepository,
    private readonly contadores: IContadorRepository,
    private readonly config: IConfiguracionRepository,
    private readonly ids: IIdGenerator,
    private readonly clock: IClock,
    private readonly webhooks: IWebhookPublisher,
    private readonly logger: ILogger,
  ) {}

  async ejecutar(input: CrearTicketInput): Promise<Ticket> {
    const cfg = await this.config.obtenerTickets();
    const prioridad = parsePrioridad(input.prioridad);

    if (input.tipo && !cfg.tipos.includes(input.tipo)) {
      throw new ValidationError(`Tipo de ticket no válido: ${input.tipo}`, { tipo: 'No reconocido' });
    }

    const ahora = this.clock.now();
    const numero = await this.contadores.siguiente(CONTADOR_TICKETS);

    const ticket = Ticket.crear({
      id: this.ids.newId(),
      numero,
      asunto: input.asunto,
      descripcion: input.descripcion,
      tipo: input.tipo || cfg.tipos[0]!,
      prioridad,
      estadoInicial: cfg.estadoInicial,
      canal: input.canal ?? 'interno',
      sistema: input.sistema ?? null,
      grupo: input.grupo ?? null,
      empresaId: input.empresaId ?? null,
      empresaNombre: input.empresaNombre ?? null,
      contactoId: input.contactoId ?? null,
      contactoNombre: input.contactoNombre ?? null,
      contactoCorreo: input.contactoCorreo ?? null,
      solicitanteUid: input.solicitanteUid ?? null,
      creadoPorUid: input.actor.uid,
      origenPublicoId: input.origenPublicoId ?? null,
      requiereFacturacion: cfg.tiposFacturables.includes(input.tipo),
      estadoFacturacion: input.estadoFacturacion,
      horasSla: horasSlaDe(cfg, prioridad),
      ahora,
    });

    if (input.asignarAlActor && esRolTecnico(input.actor.rol)) {
      ticket.asignar(input.actor.uid, input.actor.nombre, ahora);
    }

    await this.tickets.save(ticket);
    await registrarEvento(this.tickets, this.ids, ticket.id, {
      tipo: 'creacion',
      resumen: `Ticket #${numero} creado (${ticket.canal})`,
      actor: input.actor,
      at: ahora,
    });

    await this.webhooks.publicar({
      evento: 'ticket.creado',
      canal: 'tickets',
      payload: { id: ticket.id, numero, asunto: ticket.asunto, prioridad, canal: ticket.canal },
    });

    this.logger.info('Ticket creado', { numero, canal: ticket.canal, por: input.actor.uid });
    return ticket;
  }
}
