import type { IAdjuntoTicketRepository } from '../../core/ports/repositories/IAdjuntoTicketRepository.js';
import type { IIdGenerator } from '../../core/ports/services/IIdGenerator.js';
import { sanearNombreArchivo, validarAdjunto, type AdjuntoTicket } from '../../core/entities/AdjuntoTicket.js';

const IMG_DATA_URI_RE = /<img\b([^>]*)\bsrc="data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)"([^>]*)>/gi;

/**
 * "Desinfla" las imágenes pegadas/insertadas en la descripción de un ticket (llegan como
 * `<img src="data:image/...;base64,...">` desde el editor, ver `data-editor-html` en `app.js`):
 * cada una se sube como un `AdjuntoTicket` normal y se reemplaza por una referencia liviana
 * `<img data-adj-id="…">` — lo único que se guarda en el documento del ticket. Nunca se persiste
 * el `data:` URI ahí (documento de Firestore limitado a 1 MiB; ver el mismo incidente que ya tuvo
 * el CRM viejo con adjuntos embebidos, documentado en su propio código).
 *
 * Debe correr ANTES de `Ticket.crear`/`new Ticket(...)`, que sanea la descripción y por diseño
 * SIEMPRE quita cualquier `src` de una `<img>` (nunca confía en un `src` que venga del cliente) —
 * así que si una imagen no se desinfla aquí primero, simplemente desaparece más adelante.
 */
export async function desinflarImagenesDescripcion(
  html: string,
  ticketId: string,
  actor: { uid: string; nombre: string },
  adjuntos: IAdjuntoTicketRepository,
  ids: IIdGenerator,
  ahora: Date,
): Promise<string> {
  if (!html || !html.includes('data:image')) return html || '';
  const matches = [...html.matchAll(IMG_DATA_URI_RE)];
  if (matches.length === 0) return html;

  const reemplazos = await Promise.all(
    matches.map(async (m) => {
      const [, antes, contentType, base64, despues] = m;
      // Imagen que ya es un adjunto (al editar, el editor la recibe con su `src` resuelto): se
      // conserva su referencia y no se vuelve a subir, o cada guardado la duplicaría.
      if (/\bdata-adj-id="[A-Za-z0-9_-]+"/.test(`${antes}${despues}`)) return `<img${antes}${despues}>`;
      try {
        const tamano = Math.floor((base64!.length * 3) / 4);
        validarAdjunto(contentType!, tamano);
        const nuevoId = ids.newId();
        const extension = contentType!.split('/')[1] === 'jpeg' ? 'jpg' : contentType!.split('/')[1];
        const adjunto: AdjuntoTicket = {
          id: nuevoId,
          ticketId,
          nombre: sanearNombreArchivo(`pegada-${nuevoId}.${extension}`),
          contentType: contentType!,
          tamano,
          data: `data:${contentType};base64,${base64}`,
          subidoPorUid: actor.uid,
          subidoPorNombre: actor.nombre,
          createdAt: ahora,
        };
        await adjuntos.crear(adjunto);
        return `<img data-adj-id="${nuevoId}"${antes}${despues}>`;
      } catch {
        // imagen inválida (muy grande, tipo no permitido) — se quita en vez de guardarla rota.
        return '';
      }
    }),
  );

  let salida = '';
  let cursor = 0;
  matches.forEach((m, i) => {
    salida += html.slice(cursor, m.index);
    salida += reemplazos[i];
    cursor = m.index! + m[0].length;
  });
  salida += html.slice(cursor);
  return salida;
}
