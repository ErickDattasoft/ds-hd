import type { ITicketRepository } from '../../core/ports/repositories/ITicketRepository.js';
import type { IAdjuntoTicketRepository } from '../../core/ports/repositories/IAdjuntoTicketRepository.js';
import type { IIdGenerator } from '../../core/ports/services/IIdGenerator.js';
import type { IClock } from '../../core/ports/services/IClock.js';
import type { ILogger } from '../../core/ports/services/ILogger.js';
import type { Ticket } from '../../core/entities/Ticket.js';
import type { AdjuntoTicket, AdjuntoTicketMeta } from '../../core/entities/AdjuntoTicket.js';
import {
  MAX_ADJUNTOS_POR_TICKET,
  sanearNombreArchivo,
  validarAdjunto,
} from '../../core/entities/AdjuntoTicket.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../../core/errors/DomainError.js';
import { registrarEvento } from './efectos.js';
import type { SessionUser } from '../shared/SessionUser.js';

/** Datos de subida de un adjunto (el navegador manda el archivo en base64, sin multipart). */
export interface SubirAdjuntoInput {
  actor: SessionUser;
  ticketId: string;
  nombre: string;
  contentType: string;
  /** Base64 puro (sin el prefijo `data:`). */
  base64: string;
}

/** Caso de uso: adjuntar / ver / borrar archivos de un ticket (staff y portal). */
export class AdjuntoTicketService {
  constructor(
    private readonly tickets: ITicketRepository,
    private readonly adjuntos: IAdjuntoTicketRepository,
    private readonly ids: IIdGenerator,
    private readonly clock: IClock,
    private readonly logger: ILogger,
  ) {}

  async subir(input: SubirAdjuntoInput): Promise<AdjuntoTicketMeta> {
    const ticket = await this.cargarConAcceso(input.actor, input.ticketId, 'escribir');

    const contentType = input.contentType.trim().toLowerCase();
    const base64 = input.base64.replace(/\s/g, '');
    const tamano = Math.floor((base64.length * 3) / 4) - (base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0);
    validarAdjunto(contentType, tamano);

    const yaHay = await this.adjuntos.listarPorTicket(input.ticketId);
    if (yaHay.length >= MAX_ADJUNTOS_POR_TICKET) {
      throw new ValidationError(`Máximo ${MAX_ADJUNTOS_POR_TICKET} adjuntos por ticket`, {
        archivo: 'Límite alcanzado',
      });
    }

    const nombre = sanearNombreArchivo(input.nombre);
    const ahora = this.clock.now();
    const adjunto: AdjuntoTicket = {
      id: this.ids.newId(),
      ticketId: input.ticketId,
      nombre,
      contentType,
      tamano,
      data: `data:${contentType};base64,${base64}`,
      subidoPorUid: input.actor.uid,
      subidoPorNombre: input.actor.nombre,
      createdAt: ahora,
    };
    await this.adjuntos.crear(adjunto);
    await registrarEvento(this.tickets, this.ids, ticket.id, {
      tipo: 'nota',
      resumen: `Adjuntó "${nombre}"`,
      actor: input.actor,
      at: ahora,
    });
    this.logger.info('Adjunto de ticket subido', {
      ticket: ticket.numero,
      nombre,
      tamano,
      por: input.actor.uid,
    });

    return {
      id: adjunto.id,
      ticketId: adjunto.ticketId,
      nombre: adjunto.nombre,
      contentType: adjunto.contentType,
      tamano: adjunto.tamano,
      subidoPorUid: adjunto.subidoPorUid,
      subidoPorNombre: adjunto.subidoPorNombre,
      createdAt: adjunto.createdAt,
    };
  }

  async listar(actor: SessionUser, ticketId: string): Promise<AdjuntoTicketMeta[]> {
    await this.cargarConAcceso(actor, ticketId, 'leer');
    return this.adjuntos.listarPorTicket(ticketId);
  }

  /** Devuelve el contenido de un adjunto para servirlo como descarga / imagen. */
  async ver(
    actor: SessionUser,
    ticketId: string,
    adjuntoId: string,
  ): Promise<{ nombre: string; contentType: string; buffer: Buffer }> {
    await this.cargarConAcceso(actor, ticketId, 'leer');
    const adj = await this.adjuntos.obtener(adjuntoId);
    if (!adj || adj.ticketId !== ticketId) throw new NotFoundError('Adjunto', adjuntoId);
    const base64 = adj.data.includes(',') ? adj.data.slice(adj.data.indexOf(',') + 1) : adj.data;
    return { nombre: adj.nombre, contentType: adj.contentType, buffer: Buffer.from(base64, 'base64') };
  }

  async eliminar(actor: SessionUser, ticketId: string, adjuntoId: string): Promise<void> {
    const ticket = await this.cargarConAcceso(actor, ticketId, 'escribir');
    const adj = await this.adjuntos.obtener(adjuntoId);
    if (!adj || adj.ticketId !== ticketId) throw new NotFoundError('Adjunto', adjuntoId);
    await this.adjuntos.eliminar(adjuntoId);
    await registrarEvento(this.tickets, this.ids, ticket.id, {
      tipo: 'nota',
      resumen: `Quitó el adjunto "${adj.nombre}"`,
      actor,
      at: this.clock.now(),
    });
  }

  /** Carga el ticket y verifica que `actor` pueda leerlo o escribirlo (staff o dueño del portal). */
  private async cargarConAcceso(
    actor: SessionUser,
    ticketId: string,
    modo: 'leer' | 'escribir',
  ): Promise<Ticket> {
    const ticket = await this.tickets.findById(ticketId);
    if (actor.esCliente) {
      // 404 para no revelar tickets ajenos.
      if (!ticket || ticket.solicitanteUid !== actor.uid) throw new NotFoundError('Ticket', ticketId);
      return ticket;
    }
    if (!ticket) throw new NotFoundError('Ticket', ticketId);
    const puedeTodos = actor.permisos.includes('tickets:leer_todos');
    const esSuyo = ticket.agenteAsignadoUid === actor.uid;
    if (!puedeTodos && !esSuyo) throw new ForbiddenError('Solo puedes ver tickets asignados a ti');
    if (modo === 'escribir' && !actor.permisos.includes('tickets:editar')) {
      throw new ForbiddenError('No puedes editar tickets');
    }
    return ticket;
  }
}
