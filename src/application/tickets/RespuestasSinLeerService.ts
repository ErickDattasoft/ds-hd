import type { IRespuestaSinLeerRepository } from '../../core/ports/repositories/IRespuestaSinLeerRepository.js';
import type { ILogger } from '../../core/ports/services/ILogger.js';
import type { Ticket } from '../../core/entities/Ticket.js';
import { MAX_EXTRACTO_RESPUESTA, type RespuestaSinLeer } from '../../core/entities/RespuestaSinLeer.js';
import type { SessionUser } from '../shared/SessionUser.js';
import { ticketVisiblePara } from './alcance.js';

/** Texto plano de una línea (sin etiquetas ni saltos), recortado para el listado. */
function extractoDe(cuerpo: string): string {
  const plano = cuerpo.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return plano.length > MAX_EXTRACTO_RESPUESTA ? `${plano.slice(0, MAX_EXTRACTO_RESPUESTA - 1)}…` : plano;
}

/**
 * Buzón «🔔 Respuestas» del back-office: avisa dentro del CRM (no solo por correo) que un cliente
 * contestó en un ticket. Se marca al llegar la respuesta y se limpia al abrir el ticket.
 *
 * Nunca rompe el flujo que lo llama: si Firestore falla, la respuesta ya quedó guardada como nota
 * y el aviso por correo sigue saliendo.
 */
export class RespuestasSinLeerService {
  constructor(
    private readonly repo: IRespuestaSinLeerRepository,
    private readonly logger: ILogger,
  ) {}

  async registrar(ticket: Ticket, autorNombre: string, cuerpo: string, at: Date): Promise<void> {
    try {
      await this.repo.guardar({
        ticketId: ticket.id,
        numero: ticket.numero,
        asunto: ticket.asunto,
        empresaNombre: ticket.empresaNombre ?? null,
        autorNombre,
        extracto: extractoDe(cuerpo),
        at,
        agenteAsignadoUid: ticket.agenteAsignadoUid ?? null,
        agenteAsignadoNombre: ticket.agenteAsignadoNombre ?? null,
        canalizadoA: ticket.canalizadoA ?? null,
      });
    } catch (err) {
      this.logger.warn('No se pudo marcar la respuesta como sin leer', { ticket: ticket.numero, err: String(err) });
    }
  }

  async marcarLeida(ticketId: string): Promise<void> {
    await this.repo.quitar(ticketId).catch((err) => {
      this.logger.warn('No se pudo marcar la respuesta como leída', { ticketId, err: String(err) });
    });
  }

  /** Las que el actor puede abrir (mismo alcance que la lista de tickets), la más reciente primero. */
  async listarPara(actor: SessionUser): Promise<RespuestaSinLeer[]> {
    const todas = await this.repo.listar();
    return todas
      .filter((r) => ticketVisiblePara(r, actor))
      .sort((a, b) => b.at.getTime() - a.at.getTime());
  }

  /** Marca como leídas todas las que el actor ve. */
  async marcarTodasLeidas(actor: SessionUser): Promise<number> {
    const visibles = await this.listarPara(actor);
    await Promise.all(visibles.map((r) => this.repo.quitar(r.ticketId)));
    return visibles.length;
  }
}
