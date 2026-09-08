import type { EventoTicket } from '../../core/entities/NotaTicket.js';

const FMT = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' });

/** Eventos que puede ver el cliente en un correo: nunca revelan que existen notas internas. */
const VISIBLE_CLIENTE: ReadonlySet<EventoTicket['tipo']> = new Set(['creacion', 'cambio_estado', 'asignacion']);

/** Escapa `&<>"` para interpolar texto en el HTML del correo. */
function esc(s: string): string {
  return s.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]!);
}

/**
 * Bloque HTML con la bitácora del ticket para incrustar al pie de un correo.
 * `modo: 'cliente'` filtra a creación / cambios de estado / reasignaciones (con el nombre del
 * agente); `modo: 'interno'` muestra todo. Devuelve `''` si no hay nada que mostrar.
 */
export function historialActividadHtml(
  eventos: readonly EventoTicket[],
  modo: 'cliente' | 'interno',
): string {
  const visibles = eventos
    .filter((e) => modo === 'interno' || VISIBLE_CLIENTE.has(e.tipo))
    .slice()
    .sort((a, b) => a.at.getTime() - b.at.getTime());
  if (visibles.length === 0) return '';

  const filas = visibles
    .map((e) => {
      const actor = e.actorNombre ? ` <span style="color:#64748b">— ${esc(e.actorNombre)}</span>` : '';
      return `<tr><td style="padding:4px 12px 4px 0;color:#64748b;white-space:nowrap;vertical-align:top">${esc(
        FMT.format(e.at),
      )}</td><td style="padding:4px 0">${esc(e.resumen)}${actor}</td></tr>`;
    })
    .join('');

  return `<hr /><p style="font-weight:600;margin:16px 0 6px">Actividad del ticket</p><table style="border-collapse:collapse;font-size:14px">${filas}</table>`;
}
