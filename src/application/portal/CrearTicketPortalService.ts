import type { Ticket } from '../../core/entities/Ticket.js';
import { ForbiddenError, ValidationError } from '../../core/errors/DomainError.js';
import { parsePrioridad } from '../../core/entities/value-objects/Prioridad.js';
import type { CrearTicketService } from '../tickets/CrearTicketService.js';
import { empresasDe, type SessionUser } from '../shared/SessionUser.js';

/** Datos del formulario del portal para que un cliente abra un ticket. */
export interface CrearTicketPortalInput {
  actor: SessionUser;
  asunto: string;
  descripcion: string;
  tipo: string;
  prioridad: string;
  sistema?: string;
  /** Para qué empresa es, si la cuenta lleva varias; si no se indica, la principal. */
  empresaId?: string;
  /** Nombre de esa empresa, para que el ticket la muestre en las listas del staff. */
  empresaNombre?: string | null;
}

/**
 * Caso de uso: un cliente del portal crea un ticket. Reutiliza {@link CrearTicketService}
 * fijando `canal='portal'`, `solicitanteUid` y la empresa del cliente — el cliente no puede
 * elegir a nombre de quién, y la empresa solo entre las que tiene su cuenta (un administrador
 * que lleva varias que se facturan por separado).
 */
export class CrearTicketPortalService {
  constructor(private readonly crearTicket: CrearTicketService) {}

  async ejecutar(input: CrearTicketPortalInput): Promise<Ticket> {
    if (!input.actor.esCliente) {
      throw new ForbiddenError('Solo los clientes del portal pueden usar esta acción');
    }
    const suyas = empresasDe(input.actor);
    if (!suyas.length) {
      throw new ForbiddenError('Tu cuenta no está vinculada a una empresa. Contacta a soporte.');
    }
    const empresaId = input.empresaId || suyas[0]!;
    if (!suyas.includes(empresaId)) {
      throw new ValidationError('Elige una de tus empresas', { empresaId: 'No válida' });
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
      empresaId,
      empresaNombre: input.empresaNombre ?? null,
      contactoNombre: input.actor.nombre,
      contactoCorreo: input.actor.email,
    });
  }
}
