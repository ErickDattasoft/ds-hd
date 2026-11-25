import type { IRespuestaSinLeerRepository } from '../../core/ports/repositories/IRespuestaSinLeerRepository.js';
import type { ILogger } from '../../core/ports/services/ILogger.js';
import type { Ticket } from '../../core/entities/Ticket.js';
import { DIAS_RESPUESTA_SIN_LEER, MAX_EXTRACTO_RESPUESTA, type RespuestaSinLeer } from '../../core/entities/RespuestaSinLeer.js';
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
        distribuidor: ticket.distribuidor,
      });
      // De paso se borran los avisos viejos (no se acumulan aunque alguien nunca los abra).
      const limite = at.getTime() - DIAS_RESPUESTA_SIN_LEER * 86_400_000;
      for (const viejo of (await this.repo.listar()).filter((r) => r.at.getTime() < limite)) {
        await this.repo.quitar(viejo.ticketId);
      }
    } catch (err) {
      this.logger.warn('No se pudo marcar la respuesta como sin leer', { ticket: ticket.numero, err: String(err) });
    }
  }

  /** Alguien del equipo ya le contestó al cliente: el aviso se quita para todos. */
  async marcarLeida(ticketId: string): Promise<void> {
    await this.repo.quitar(ticketId).catch((err) => {
      this.logger.warn('No se pudo marcar la respuesta como leída', { ticketId, err: String(err) });
    });
  }

  /** Esta persona abrió el ticket: deja de contarle a ella (los demás lo siguen viendo). */
  async marcarLeidaPor(ticketId: string, persona: Pick<SessionUser, 'uid' | 'nombre'>): Promise<void> {
    await this.repo.marcarLeidaPor(ticketId, { uid: persona.uid, nombre: persona.nombre }).catch((err) => {
      this.logger.warn('No se pudo marcar la respuesta como leída', { ticketId, err: String(err) });
    });
  }

  /** Las que el actor puede abrir y AÚN NO HA LEÍDO él, la más reciente primero. */
  async listarPara(actor: SessionUser): Promise<RespuestaSinLeer[]> {
    return (await this.listarVisibles(actor)).filter((r) => !(r.leidaPor ?? []).some((p) => p.uid === actor.uid));
  }

  /** Todas las que el actor puede abrir (leídas o no por él), para ver quién ya las leyó. */
  async listarVisibles(actor: SessionUser): Promise<RespuestaSinLeer[]> {
    const limite = Date.now() - DIAS_RESPUESTA_SIN_LEER * 86_400_000;
    const todas = await this.repo.listar();
    return todas
      .filter((r) => r.at.getTime() >= limite && ticketVisiblePara(r, actor))
      .sort((a, b) => b.at.getTime() - a.at.getTime());
  }

  /** Marca como leídas (para el actor) todas las que ve. */
  async marcarTodasLeidas(actor: SessionUser): Promise<number> {
    const pendientes = await this.listarPara(actor);
    for (const r of pendientes) await this.marcarLeidaPor(r.ticketId, actor);
    return pendientes.length;
  }
}
