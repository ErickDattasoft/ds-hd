import type { ITicketPublicoRepository } from '../../core/ports/repositories/ITicketPublicoRepository.js';
import type { ILogger } from '../../core/ports/services/ILogger.js';
import type { Ticket } from '../../core/entities/Ticket.js';
import { NotFoundError, ValidationError } from '../../core/errors/DomainError.js';
import type { CrearTicketService } from './CrearTicketService.js';
import type { SessionUser } from '../shared/SessionUser.js';
import { parsePrioridad } from '../../core/entities/value-objects/Prioridad.js';

/** Casos de uso: aceptar o rechazar un ticket del buzón público. */
export class GestionTicketPublicoService {
  constructor(
    private readonly buzon: ITicketPublicoRepository,
    private readonly crearTicket: CrearTicketService,
    private readonly logger: ILogger,
  ) {}

  async aceptar(input: { actor: SessionUser; id: string }): Promise<Ticket> {
    const entrada = await this.buzon.findById(input.id);
    if (!entrada) throw new NotFoundError('Ticket público', input.id);
    if (entrada.estado !== 'pendiente') {
      throw new ValidationError(`Este ticket ya fue ${entrada.estado}`);
    }

    let prioridad;
    try {
      prioridad = parsePrioridad(entrada.prioridad);
    } catch {
      prioridad = 'Media' as const;
    }

    const ticket = await this.crearTicket.ejecutar({
      actor: input.actor,
      asunto: entrada.asunto,
      descripcion: entrada.descripcion,
      tipo: entrada.tipo ?? 'Soporte Técnico',
      prioridad,
      sistema: entrada.sistema,
      canal: 'publico',
      empresaNombre: entrada.empresa,
      contactoNombre: entrada.nombre,
      contactoCorreo: entrada.correo,
      origenPublicoId: entrada.id,
    });

    await this.buzon.marcarAceptado(entrada.id, ticket.numero);
    this.logger.info('Ticket público aceptado', { folio: entrada.folio, numero: ticket.numero });
    return ticket;
  }

  async rechazar(input: { actor: SessionUser; id: string }): Promise<void> {
    const entrada = await this.buzon.findById(input.id);
    if (!entrada) throw new NotFoundError('Ticket público', input.id);
    if (entrada.estado !== 'pendiente') {
      throw new ValidationError(`Este ticket ya fue ${entrada.estado}`);
    }
    await this.buzon.marcarRechazado(entrada.id);
    this.logger.info('Ticket público rechazado', { folio: entrada.folio, por: input.actor.uid });
  }
}
