import type { ITicketRepository } from '../../core/ports/repositories/ITicketRepository.js';
import type { IConfiguracionRepository } from '../../core/ports/repositories/IConfiguracionRepository.js';
import type { IAdjuntoTicketRepository } from '../../core/ports/repositories/IAdjuntoTicketRepository.js';
import type { IClock } from '../../core/ports/services/IClock.js';
import type { IIdGenerator } from '../../core/ports/services/IIdGenerator.js';
import type { Ticket } from '../../core/entities/Ticket.js';
import { horasSlaDe } from '../../core/entities/ConfiguracionTickets.js';
import { parsePrioridad } from '../../core/entities/value-objects/Prioridad.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../../core/errors/DomainError.js';
import { registrarEvento } from './efectos.js';
import { desinflarImagenesDescripcion } from './desinflarImagenesDescripcion.js';
import type { SessionUser } from '../shared/SessionUser.js';

/** Todo lo que se captura al crear un ticket y se puede corregir después. */
export interface EditarTicketInput {
  actor: SessionUser;
  ticketId: string;
  asunto: string;
  descripcion: string;
  tipo: string;
  sistema: string | null;
  prioridad: string;
  grupo: string | null;
  empresaId: string | null;
  empresaNombre: string | null;
  contactoNombre: string | null;
  contactoCorreo: string | null;
  cc: string[];
  cco: string[];
  solicitadoPor: string;
  canalizadoA: string;
  notasInternas?: string;
}

const ETIQUETAS: Record<string, string> = {
  asunto: 'asunto',
  descripcion: 'descripción',
  tipo: 'tipo',
  sistema: 'sistema',
  prioridad: 'prioridad',
  grupo: 'grupo',
  empresaNombre: 'empresa',
  contactoNombre: 'contacto',
  contactoCorreo: 'correo del contacto',
  cc: 'CC',
  cco: 'CCO',
  solicitadoPor: 'solicitado por',
  canalizadoA: 'canalizado a',
  notasInternas: 'notas internas',
};

/**
 * Caso de uso: editar un ticket ya creado (asunto, descripción, tipo, empresa, contacto…), como
 * el botón "Editar" del CRM viejo. Estado, agente, facturación y agenda van por sus propios
 * servicios, que el controlador invoca solo si cambiaron.
 */
export class EditarTicketService {
  constructor(
    private readonly tickets: ITicketRepository,
    private readonly config: IConfiguracionRepository,
    private readonly adjuntos: IAdjuntoTicketRepository,
    private readonly ids: IIdGenerator,
    private readonly clock: IClock,
  ) {}

  async ejecutar(input: EditarTicketInput): Promise<Ticket> {
    if (!input.actor.permisos.includes('tickets:editar')) {
      throw new ForbiddenError('No puedes editar tickets');
    }
    const ticket = await this.tickets.findById(input.ticketId);
    if (!ticket) throw new NotFoundError('Ticket', input.ticketId);
    if (!input.actor.permisos.includes('tickets:leer_todos') && ticket.agenteAsignadoUid !== input.actor.uid) {
      throw new ForbiddenError('Solo puedes editar tickets asignados a ti');
    }
    if (ticket.eliminadoPorAdmin) {
      throw new ValidationError('Este folio es de un ticket eliminado; no se puede editar.');
    }
    const cfg = await this.config.obtenerTickets();
    // El tipo que ya tenía se acepta aunque ya no esté en el catálogo (tickets migrados).
    if (input.tipo !== ticket.tipo && !cfg.tipos.includes(input.tipo)) {
      throw new ValidationError(`Tipo de ticket no válido: ${input.tipo}`, { tipo: 'No reconocido' });
    }
    const prioridad = parsePrioridad(input.prioridad);
    const ahora = this.clock.now();
    const descripcion = await desinflarImagenesDescripcion(
      input.descripcion,
      ticket.id,
      { uid: input.actor.uid, nombre: input.actor.nombre },
      this.adjuntos,
      this.ids,
      ahora,
    );

    const antes = this.foto(ticket);
    ticket.editarDatos(
      {
        asunto: input.asunto,
        descripcion,
        tipo: input.tipo,
        sistema: input.sistema,
        prioridad,
        grupo: input.grupo,
        empresaId: input.empresaId,
        empresaNombre: input.empresaNombre,
        contactoNombre: input.contactoNombre,
        contactoCorreo: input.contactoCorreo,
        cc: input.cc,
        cco: input.cco,
        horasSla: horasSlaDe(cfg, prioridad),
      },
      ahora,
    );
    const puedeNotas = input.actor.permisos.includes('tickets:ver_notas_internas');
    ticket.actualizarGestion(
      {
        solicitadoPor: input.solicitadoPor,
        canalizadoA: input.canalizadoA,
        ...(puedeNotas && input.notasInternas !== undefined ? { notasInternas: input.notasInternas } : {}),
      },
      ahora,
    );
    const despues = this.foto(ticket);
    const cambios = Object.keys(ETIQUETAS).filter((k) => antes[k] !== despues[k]);
    if (!cambios.length) return ticket;

    await this.tickets.save(ticket);
    await registrarEvento(this.tickets, this.ids, ticket.id, {
      tipo: 'nota',
      resumen: `Editó: ${cambios.map((k) => ETIQUETAS[k]).join(', ')}`,
      actor: input.actor,
      at: ahora,
    });
    return ticket;
  }

  /** Valores comparables de los campos editables, para anotar en la actividad qué cambió. */
  private foto(t: Ticket): Record<string, string> {
    return {
      asunto: t.asunto,
      descripcion: t.descripcion,
      tipo: t.tipo,
      sistema: t.sistema ?? '',
      prioridad: t.prioridad,
      grupo: t.grupo ?? '',
      empresaNombre: t.empresaNombre ?? '',
      contactoNombre: t.contactoNombre ?? '',
      contactoCorreo: t.contactoCorreo ?? '',
      cc: t.cc.join(','),
      cco: t.cco.join(','),
      solicitadoPor: t.solicitadoPor ?? '',
      canalizadoA: t.canalizadoA ?? '',
      notasInternas: t.notasInternas ?? '',
    };
  }
}
