import type { IAdjuntoTicketRepository } from '../../core/ports/repositories/IAdjuntoTicketRepository.js';

const IMG_RE = /<img([^>]*)>/g;
const ADJ_ID_RE = /data-adj-id="([A-Za-z0-9_-]+)"/;

/**
 * Resuelve cada `<img data-adj-id="…">` de una descripción de ticket (ya saneada, sin `src` —
 * ver `sanitizarDescripcionHtml`) contra su adjunto real, inyectando el `src` con el `data:` URI.
 * Verifica que el adjunto sea de ESTE ticket (nunca confía en el id a ciegas) — para el detalle,
 * imprimir y el portal de cliente.
 */
export async function resolverImagenesDescripcion(
  html: string,
  ticketId: string,
  adjuntos: IAdjuntoTicketRepository,
): Promise<string> {
  if (!html || !html.includes('data-adj-id')) return html || '';
  const ids = new Set<string>();
  for (const m of html.matchAll(IMG_RE)) {
    const idMatch = ADJ_ID_RE.exec(m[1] ?? '');
    if (idMatch) ids.add(idMatch[1]!);
  }
  if (ids.size === 0) return html;

  const pares = await Promise.all([...ids].map(async (id) => [id, await adjuntos.obtener(id)] as const));
  const porId = new Map(
    pares.filter((par): par is [string, NonNullable<(typeof pares)[number][1]>] => par[1] !== null && par[1].ticketId === ticketId),
  );

  return html.replace(IMG_RE, (completo, atributos: string) => {
    const idMatch = ADJ_ID_RE.exec(atributos);
    if (!idMatch) return completo;
    const adj = porId.get(idMatch[1]!);
    if (!adj) return '<span style="color:#999">[imagen no disponible]</span>';
    return `<img src="${adj.data}"${atributos}>`;
  });
}

/** Quita las imágenes de una descripción (ya saneada) — para correos: `data-adj-id` no significa
 *  nada fuera de la app, e incrustar el `data:` URI infla el correo sin garantía de que el
 *  cliente de correo lo muestre. El ticket sigue listando sus adjuntos aparte. */
export function quitarImagenesDescripcion(html: string): string {
  if (!html || !html.includes('<img')) return html || '';
  return html.replace(IMG_RE, '').trim();
}
