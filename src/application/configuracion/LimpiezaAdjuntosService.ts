import { zipSync } from 'fflate';
import type { IAdjuntoTicketRepository } from '../../core/ports/repositories/IAdjuntoTicketRepository.js';
import type { ITicketQueries } from '../../core/ports/repositories/ITicketQueries.js';
import type { ITicketRepository } from '../../core/ports/repositories/ITicketRepository.js';
import type { IIdGenerator } from '../../core/ports/services/IIdGenerator.js';
import type { IClock } from '../../core/ports/services/IClock.js';
import type { ILogger } from '../../core/ports/services/ILogger.js';
import type { AdjuntoTicketMeta } from '../../core/entities/AdjuntoTicket.js';
import type { Ticket } from '../../core/entities/Ticket.js';
import { ForbiddenError } from '../../core/errors/DomainError.js';
import { registrarEvento } from '../tickets/efectos.js';
import type { SessionUser } from '../shared/SessionUser.js';

/** Un adjunto que se puede archivar y eliminar, con los datos de su ticket para nombrarlo. */
export interface CandidatoLimpieza extends AdjuntoTicketMeta {
  ticketNumero: number;
  empresaNombre: string;
  cerradoEn: Date;
  /** `ticket_empresa_fecha_nombre`, igual que el CRM viejo. */
  nombreArchivo: string;
}

/** Candidatos de una búsqueda: la tanda a procesar ahora y el total pendiente. */
export interface ResultadoLimpieza {
  dias: number;
  tanda: CandidatoLimpieza[];
  bytesTanda: number;
  total: number;
  bytesTotal: number;
}

/** Por tanda: el ZIP se arma en memoria del Worker, así que se limita cuántos y cuánto pesan. */
export const MAX_ARCHIVOS_TANDA = 25;
export const MAX_BYTES_TANDA = 15 * 1024 * 1024;

const sanitizar = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9._-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 150) || 'adjunto';

/**
 * Mantenimiento de adjuntos (paridad con «🗄️ Archivar y eliminar adjuntos no permanentes» del
 * CRM viejo): los adjuntos de tickets **cerrados** hace más de N días que no están marcados
 * 📌 permanentes se descargan en un ZIP y después se eliminan de Firestore para liberar la cuota.
 * Nunca toca imágenes pegadas en la descripción de un ticket (la descripción las necesita).
 */
export class LimpiezaAdjuntosService {
  constructor(
    private readonly adjuntos: IAdjuntoTicketRepository,
    private readonly ticketQueries: ITicketQueries,
    private readonly tickets: ITicketRepository,
    private readonly ids: IIdGenerator,
    private readonly clock: IClock,
    private readonly logger: ILogger,
  ) {}

  async buscar(actor: SessionUser, dias: number): Promise<ResultadoLimpieza> {
    const todos = await this.candidatos(actor, dias);
    const tanda: CandidatoLimpieza[] = [];
    let bytesTanda = 0;
    for (const c of todos) {
      if (tanda.length >= MAX_ARCHIVOS_TANDA) break;
      if (tanda.length && bytesTanda + c.tamano > MAX_BYTES_TANDA) break;
      tanda.push(c);
      bytesTanda += c.tamano;
    }
    return {
      dias,
      tanda,
      bytesTanda,
      total: todos.length,
      bytesTotal: todos.reduce((n, c) => n + c.tamano, 0),
    };
  }

  /** ZIP con los adjuntos indicados — solo los que siguen siendo candidatos. */
  async zip(actor: SessionUser, dias: number, ids: readonly string[]): Promise<Buffer> {
    const elegidos = await this.filtrar(actor, dias, ids);
    const archivos: Record<string, Uint8Array> = {};
    for (const c of elegidos) {
      const adj = await this.adjuntos.obtener(c.id);
      if (!adj?.data) continue;
      const base64 = adj.data.includes(',') ? adj.data.slice(adj.data.indexOf(',') + 1) : adj.data;
      archivos[c.nombreArchivo] = new Uint8Array(Buffer.from(base64, 'base64'));
    }
    // Imágenes y PDF ya vienen comprimidos: se guardan tal cual (level 0), más rápido.
    return Buffer.from(zipSync(archivos, { level: 0 }));
  }

  /** Elimina los adjuntos indicados que sigan siendo candidatos y lo anota en cada ticket. */
  async eliminar(actor: SessionUser, dias: number, ids: readonly string[]): Promise<number> {
    const elegidos = await this.filtrar(actor, dias, ids);
    const ahora = this.clock.now();
    for (const c of elegidos) {
      await this.adjuntos.eliminar(c.id);
      await registrarEvento(this.tickets, this.ids, c.ticketId, {
        tipo: 'nota',
        resumen: `Adjunto archivado localmente y eliminado: ${c.nombre}`,
        actor,
        at: ahora,
      });
    }
    this.logger.info('Limpieza de adjuntos', { eliminados: elegidos.length, dias, por: actor.uid });
    return elegidos.length;
  }

  private async filtrar(actor: SessionUser, dias: number, ids: readonly string[]): Promise<CandidatoLimpieza[]> {
    const pedidos = new Set(ids);
    return (await this.candidatos(actor, dias)).filter((c) => pedidos.has(c.id));
  }

  private async candidatos(actor: SessionUser, dias: number): Promise<CandidatoLimpieza[]> {
    if (!actor.permisos.includes('configuracion:integraciones')) {
      throw new ForbiddenError('No puedes hacer mantenimiento de adjuntos');
    }
    const limite = this.clock.now().getTime() - Math.max(0, dias) * 86_400_000;
    const cerrados = new Map<string, { ticket: Ticket; cerradoEn: Date }>();
    for (const t of await this.ticketQueries.listar({})) {
      const cerradoEn = t.cerradoEn ?? t.updatedAt;
      if (t.esCerrado && cerradoEn.getTime() <= limite) cerrados.set(t.id, { ticket: t, cerradoEn });
    }
    if (!cerrados.size) return [];

    const usados = new Set<string>();
    const lista: CandidatoLimpieza[] = [];
    const metas = (await this.adjuntos.listarTodosMeta()).sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );
    for (const a of metas) {
      const c = cerrados.get(a.ticketId);
      if (!c || a.permanente) continue;
      if (c.ticket.descripcion.includes(`data-adj-id="${a.id}"`)) continue;
      lista.push({
        ...a,
        ticketNumero: c.ticket.numero,
        empresaNombre: c.ticket.empresaNombre ?? '',
        cerradoEn: c.cerradoEn,
        nombreArchivo: this.nombreUnico(c.ticket, c.cerradoEn, a.nombre, usados),
      });
    }
    return lista.sort((x, y) => x.ticketNumero - y.ticketNumero);
  }

  private nombreUnico(t: Ticket, cerradoEn: Date, nombre: string, usados: Set<string>): string {
    const fecha = cerradoEn.toISOString().slice(0, 10);
    let fname = sanitizar(`${t.numero}_${t.empresaNombre || 'sin-empresa'}_${fecha}_${nombre || 'adjunto'}`);
    if (usados.has(fname)) {
      const punto = fname.lastIndexOf('.');
      const base = punto > 0 ? fname.slice(0, punto) : fname;
      const ext = punto > 0 ? fname.slice(punto) : '';
      let i = 2;
      while (usados.has(`${base}_${i}${ext}`)) i++;
      fname = `${base}_${i}${ext}`;
    }
    usados.add(fname);
    return fname;
  }
}
