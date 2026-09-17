import { createHmac, timingSafeEqual } from 'node:crypto';
import type { ITicketRepository } from '../../core/ports/repositories/ITicketRepository.js';
import type { IClock } from '../../core/ports/services/IClock.js';
import type { Ticket } from '../../core/entities/Ticket.js';
import { NotFoundError, UnauthorizedError } from '../../core/errors/DomainError.js';
import { registrarEvento } from './efectos.js';
import type { IIdGenerator } from '../../core/ports/services/IIdGenerator.js';

const ETIQUETAS = ['', 'Mala', 'Regular', 'Buena', 'Muy buena', 'Excelente'];

/**
 * Encuesta de satisfacción: ligas firmadas (sin login) que el cliente recibe en el correo de
 * "resuelto/cerrado" para calificar la atención de 1 a 5 y dejar un comentario.
 */
export class EncuestaSatisfaccionService {
  constructor(
    private readonly tickets: ITicketRepository,
    private readonly ids: IIdGenerator,
    private readonly clock: IClock,
    private readonly secreto: string,
    private readonly baseUrl: string,
  ) {}

  private firmar(ticketId: string): string {
    return createHmac('sha256', this.secreto).update(`encuesta:${ticketId}`).digest('base64url').slice(0, 32);
  }

  private verificar(ticketId: string, firma: string): void {
    const esperada = Buffer.from(this.firmar(ticketId));
    const recibida = Buffer.from(firma);
    if (esperada.length !== recibida.length || !timingSafeEqual(esperada, recibida)) {
      throw new UnauthorizedError('Liga de encuesta inválida');
    }
  }

  /** URL de la encuesta para una calificación dada. */
  url(ticketId: string, calificacion?: number): string {
    const base = `${this.baseUrl}/encuesta/${encodeURIComponent(ticketId)}/${this.firmar(ticketId)}`;
    return calificacion ? `${base}?c=${calificacion}` : base;
  }

  /** Bloque HTML con las 5 opciones, para el final del correo al cliente. */
  bloqueCorreo(ticket: Pick<Ticket, 'id'>): string {
    const botones = [1, 2, 3, 4, 5]
      .map(
        (n) =>
          `<a href="${this.url(ticket.id, n)}" style="display:inline-block;margin:2px;padding:8px 12px;border-radius:6px;background:#eef2ff;color:#3730a3;text-decoration:none;font-family:sans-serif">${'★'.repeat(n)}<br><small>${ETIQUETAS[n]}</small></a>`,
      )
      .join('');
    return `<div style="margin-top:20px;padding:12px;border-top:1px solid #e5e7eb;font-family:sans-serif"><p><strong>¿Cómo calificarías la atención que recibiste?</strong></p>${botones}</div>`;
  }

  async ver(ticketId: string, firma: string): Promise<Ticket> {
    this.verificar(ticketId, firma);
    const t = await this.tickets.findById(ticketId);
    if (!t) throw new NotFoundError('Ticket', ticketId);
    return t;
  }

  async responder(ticketId: string, firma: string, calificacion: number, comentario?: string | null): Promise<Ticket> {
    const t = await this.ver(ticketId, firma);
    const ahora = this.clock.now();
    const anterior = t.satisfaccion;
    t.calificar(calificacion, comentario ?? anterior?.comentario ?? null, ahora);
    await this.tickets.save(t);
    if (anterior?.calificacion !== t.satisfaccion!.calificacion || (comentario && comentario !== anterior?.comentario)) {
      await registrarEvento(this.tickets, this.ids, t.id, {
        tipo: 'encuesta',
        resumen: `Encuesta del cliente: ${'★'.repeat(t.satisfaccion!.calificacion)} (${ETIQUETAS[t.satisfaccion!.calificacion]})${
          t.satisfaccion!.comentario ? ` — "${t.satisfaccion!.comentario}"` : ''
        }`,
        actor: null,
        at: ahora,
      });
    }
    return t;
  }

  static etiqueta(n: number): string {
    return ETIQUETAS[n] ?? '';
  }
}
