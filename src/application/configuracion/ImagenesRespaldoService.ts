import { zipSync } from 'fflate';
import type { IAdjuntoTicketRepository } from '../../core/ports/repositories/IAdjuntoTicketRepository.js';
import type { ITicketQueries } from '../../core/ports/repositories/ITicketQueries.js';
import type { AdjuntoTicket } from '../../core/entities/AdjuntoTicket.js';
import { ForbiddenError } from '../../core/errors/DomainError.js';
import type { SessionUser } from '../shared/SessionUser.js';
import type { INotaImagenRepository } from '../../core/ports/repositories/INotaImagenRepository.js';

/** Tickets que tienen imágenes, para avisar al respaldar. */
export interface ResumenImagenes {
  total: number;
  /** 🖼 Imágenes pegadas en 🗒️ Mis notas (de todo el equipo); van en la carpeta `notas/` del .zip. */
  notas?: number;
  tickets: { numero: number; imagenes: number }[];
}

const EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
};

/**
 * Las imágenes de los tickets (pegadas en la descripción o adjuntas) no van en el JSON del
 * respaldo: viven aparte, en `tickets_adjuntos`. Al respaldar se avisa qué tickets tienen y se
 * pueden bajar en un .zip, cada una nombrada con el folio de su ticket (`ticket-1059-1.png`).
 */
export class ImagenesRespaldoService {
  constructor(
    private readonly adjuntos: IAdjuntoTicketRepository,
    private readonly tickets: ITicketQueries,
    private readonly notaImagenes?: INotaImagenRepository,
  ) {}

  async resumen(actor: SessionUser): Promise<ResumenImagenes> {
    const porTicket = await this.agrupar(actor);
    const notas = this.notaImagenes ? (await this.notaImagenes.listarTodas()).length : 0;
    return {
      ...(notas ? { notas } : {}),
      total: porTicket.reduce((n, g) => n + g.imagenes.length, 0),
      tickets: porTicket.map((g) => ({ numero: g.numero, imagenes: g.imagenes.length })),
    };
  }

  /** Zip con las imágenes de los folios indicados (todos, si no se indica ninguno). */
  async zip(actor: SessionUser, soloFolios?: readonly number[]): Promise<Buffer> {
    const archivos: Record<string, Uint8Array> = {};
    const elegidos = soloFolios?.length ? new Set(soloFolios) : null;
    for (const g of await this.agrupar(actor)) {
      if (elegidos && !elegidos.has(g.numero)) continue;
      g.imagenes.forEach((img, i) => {
        const base64 = img.data.slice(img.data.indexOf(',') + 1);
        const ext = EXTENSION[img.contentType] ?? img.contentType.split('/')[1] ?? 'img';
        archivos[`ticket-${g.numero}-${i + 1}.${ext}`] = new Uint8Array(Buffer.from(base64, 'base64'));
      });
    }
    // 🗒️ Imágenes de las notas (solo en el respaldo completo, no al elegir folios): `notas/<uid>/…`.
    if (!elegidos && this.notaImagenes) {
      for (const img of await this.notaImagenes.listarTodas()) {
        const ext = EXTENSION[img.contentType] ?? 'img';
        const base = img.nombre.replace(/\.[^.]+$/, '').replace(/[^\w.-]+/g, '-').slice(0, 60) || 'imagen';
        archivos[`notas/${img.uid}/${img.notaId.slice(0, 8)}-${base}-${img.id.slice(0, 6)}.${ext}`] = new Uint8Array(
          Buffer.from(img.data.slice(img.data.indexOf(',') + 1), 'base64'),
        );
      }
    }
    // Las imágenes ya vienen comprimidas: se guardan tal cual (level 0), más rápido y del mismo tamaño.
    return Buffer.from(zipSync(archivos, { level: 0 }));
  }

  /** Imágenes agrupadas por folio, en orden de folio y, dentro de cada ticket, de subida. */
  private async agrupar(actor: SessionUser): Promise<{ numero: number; imagenes: AdjuntoTicket[] }[]> {
    if (!actor.permisos.includes('configuracion:integraciones')) {
      throw new ForbiddenError('No puedes descargar respaldos');
    }
    const imagenes = await this.adjuntos.listarImagenes();
    if (!imagenes.length) return [];
    const folio = new Map((await this.tickets.listar({})).map((t) => [t.id, t.numero]));
    const grupos = new Map<number, AdjuntoTicket[]>();
    for (const img of imagenes) {
      const numero = folio.get(img.ticketId);
      if (numero === undefined) continue; // imagen de un ticket que ya no existe
      grupos.set(numero, [...(grupos.get(numero) ?? []), img]);
    }
    return [...grupos]
      .sort(([a], [b]) => a - b)
      .map(([numero, lista]) => ({
        numero,
        imagenes: lista.sort((x, y) => x.createdAt.getTime() - y.createdAt.getTime()),
      }));
  }
}
