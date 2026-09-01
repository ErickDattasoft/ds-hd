import type { Ticket } from '../../core/entities/Ticket.js';
import { ForbiddenError } from '../../core/errors/DomainError.js';
import { parsePrioridad } from '../../core/entities/value-objects/Prioridad.js';
import type { CrearTicketService } from '../tickets/CrearTicketService.js';
import type { SessionUser } from '../shared/SessionUser.js';

export interface CrearTicketPortalInput {
  actor: SessionUser;
  asunto: string;
  descripcion: string;
  tipo: string;
  prioridad: string;
  sistema?: string;
}

/**
 * Caso de uso: un cliente del portal crea un ticket. Reutiliza {@link CrearTicketService}
 * fijando `canal='portal'`, `solicitanteUid` y la empresa del cliente — el cliente no puede
 * elegir a nombre de quién ni para qué empresa.
 */
export class CrearTicketPortalService {
  constructor(private readonly crearTicket: CrearTicketService) {}

  async ejecutar(input: CrearTicketPortalInput): Promise<Ticket> {
    if (!input.actor.esCliente) {
      throw new ForbiddenError('Solo los clientes del portal pueden usar esta acción');
    }
    if (!input.actor.empresaId) {
      throw new ForbiddenError('Tu cuenta no está vinculada a una empresa. Contacta a soporte.');
    }

    return this.crearTicket.ejecutar({
      actor: input.actor,
      asunto: input.asunto,
      descripcion: input.descripcion,
      tipo: input.tipo,
      prioridad: parsePrioridad(input.prioridad),
      sistema: input.sistema ?? null,
      canal: 'portal',
      solicitanteUid: input.actor.uid,
      empresaId: input.actor.empresaId,
      contactoNombre: input.actor.nombre,
      contactoCorreo: input.actor.email,
    });
  }
}
