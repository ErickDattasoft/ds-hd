import type { Ticket } from '../../core/entities/Ticket.js';
import type { EventoTicket } from '../../core/entities/NotaTicket.js';
import { escaparHtml as esc, historialActividadHtml } from './historialCorreo.js';

/** Normaliza, valida (contiene `@`) y deduplica una lista de correos. */
function correosValidos(lista: readonly string[]): string[] {
  const vistos = new Set<string>();
  const out: string[] = [];
  for (const raw of lista) {
    const e = raw.trim();
    if (!e.includes('@')) continue;
    const clave = e.toLowerCase();
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    out.push(e);
  }
  return out;
}

/** A quién va un correo de notificación de un ticket. */
export interface DestinatariosTicket {
  para: { email: string; nombre?: string }[];
  cc: { email: string; nombre?: string }[];
  responderA?: { email: string; nombre?: string };
  /** `true` si el ticket no tiene correo de contacto (el cliente no recibió nada directo). */
  sinContacto: boolean;
}

/**
 * Decide los destinatarios de un correo de ticket: va al contacto (si tiene correo), con copia
 * a los `correosNotificacion` de la configuración y a `copiaInterna` (agente asignado o quien
 * hace la acción). Si el contacto no tiene correo, el mensaje va directo a esa lista para que
 * no se pierda. `responderA` = primer correo de la lista de configuración.
 */
export function destinatariosTicket(
  ticket: Pick<Ticket, 'contactoCorreo' | 'contactoNombre'>,
  correosNotificacion: readonly string[],
  copiaInterna: string | null,
): DestinatariosTicket {
  const config = correosValidos(correosNotificacion);
  const copias = correosValidos([...config, ...(copiaInterna ? [copiaInterna] : [])]);
  const responderA = config[0] ? { email: config[0] } : undefined;
  const contacto = ticket.contactoCorreo?.trim() || '';

  if (contacto) {
    return {
      para: [{ email: contacto, ...(ticket.contactoNombre ? { nombre: ticket.contactoNombre } : {}) }],
      cc: copias.filter((e) => e.toLowerCase() !== contacto.toLowerCase()).map((email) => ({ email })),
      responderA,
      sinContacto: false,
    };
  }
  return { para: copias.map((email) => ({ email })), cc: [], responderA, sinContacto: true };
}

/** Una fila `<tr>` de la tabla de datos del ticket en el correo. */
function fila(k: string, v: string | null | undefined): string {
  return `<tr><td style="padding:6px 12px;font-weight:bold;background:#f3f4f6;width:130px">${k}</td><td style="padding:6px 12px">${esc(
    v || '—',
  )}</td></tr>`;
}

/**
 * Cuerpo HTML de un correo con el resumen del ticket (para el botón "Reenviar correo"): tabla
 * de datos + descripción + historial de actividad visible para el cliente. Nunca incluye notas
 * internas.
 */
export function resumenTicketHtml(
  ticket: Ticket,
  eventos: readonly EventoTicket[],
  opts: { reenvio?: boolean; sinContacto?: boolean } = {},
): string {
  const avisoSinContacto = opts.sinContacto
    ? `<p style="background:#fef3c7;color:#92400e;padding:8px 12px;border-radius:6px;font-size:13px">⚠️ El contacto no tiene correo registrado — este ticket no se notificó al cliente.</p>`
    : '';
  const avisoReenvio = opts.reenvio
    ? `<p style="background:#e0e7ff;color:#4338ca;padding:8px 12px;border-radius:6px;font-size:13px">📨 Este correo es un reenvío — revisa la descripción del ticket por si hay cambios o información nueva.</p>`
    : '';

  return `${avisoSinContacto}${avisoReenvio}
    <h2 style="font-family:sans-serif">[Ticket #${ticket.numero}] ${esc(ticket.asunto)}</h2>
    <table style="border-collapse:collapse;font-family:sans-serif;font-size:14px">
      ${fila('Empresa', ticket.empresaNombre)}
      ${fila('Contacto', ticket.contactoNombre)}
      ${fila('Tipo', ticket.tipo)}
      ${fila('Prioridad', ticket.prioridad)}
      ${fila('Estado', ticket.estado)}
      ${fila('Agente', ticket.agenteAsignadoNombre)}
    </table>
    <h3 style="font-family:sans-serif;margin-top:16px">Descripción</h3>
    <div style="background:#f9fafb;padding:12px;border-radius:6px;font-family:sans-serif;white-space:pre-wrap">${esc(
      ticket.descripcion,
    )}</div>
    ${historialActividadHtml(eventos, 'cliente')}`;
}
