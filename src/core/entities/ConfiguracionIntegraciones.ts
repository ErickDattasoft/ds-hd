/** Eventos de dominio que pueden disparar una notificación externa. */
export const EVENTOS_NOTIFICABLES = [
  'ticket.creado',
  'ticket.asignado',
  'ticket.resuelto',
  'ticket.cerrado',
  'ticket.facturado',
  'ticket.programado',
  'cotizacion.creada',
] as const;

export type EventoNotificable = (typeof EVENTOS_NOTIFICABLES)[number];

const SET_EVENTOS = new Set<string>(EVENTOS_NOTIFICABLES);

/** Type guard: ¿`value` es uno de los eventos de {@link EVENTOS_NOTIFICABLES}? */
export function esEventoNotificable(value: unknown): value is EventoNotificable {
  return typeof value === 'string' && SET_EVENTOS.has(value);
}

/** Etiqueta legible por evento, para pintar la matriz de reglas en la UI. */
export const ETIQUETAS_EVENTOS: Record<EventoNotificable, string> = {
  'ticket.creado': 'Ticket creado',
  'ticket.asignado': 'Ticket asignado',
  'ticket.resuelto': 'Ticket resuelto',
  'ticket.cerrado': 'Ticket cerrado',
  'ticket.facturado': 'Ticket facturado',
  'ticket.programado': 'Recordatorio de ticket programado',
  'cotizacion.creada': 'Cotización creada',
};

/** Qué canales dispara un evento dado. */
export interface ReglaEvento {
  webhook: boolean;
  whatsapp: boolean;
}

export type MatrizReglas = Record<EventoNotificable, ReglaEvento>;

/** Config de integraciones externas (documento `configuracion/integraciones`). */
export interface ConfiguracionIntegraciones {
  /** Si viene vacío, `N8nWebhookPublisher` usa el env var `N8N_WEBHOOK_TICKETS` como respaldo. */
  n8nWebhookTickets: string;
  /** Si viene vacío, `N8nWebhookPublisher` usa el env var `N8N_WEBHOOK_COTIZACIONES` como respaldo. */
  n8nWebhookCotizaciones: string;
  whatsappHabilitado: boolean;
  whatsappTelefono: string;
  whatsappApiKey: string;
  reglas: MatrizReglas;
}

/** Matriz por defecto: webhook activo y WhatsApp inactivo para todos los eventos. */
function reglasPorDefecto(): MatrizReglas {
  return Object.fromEntries(
    EVENTOS_NOTIFICABLES.map((evento) => [evento, { webhook: true, whatsapp: false }]),
  ) as MatrizReglas;
}

export const CONFIG_INTEGRACIONES_POR_DEFECTO: ConfiguracionIntegraciones = {
  n8nWebhookTickets: '',
  n8nWebhookCotizaciones: '',
  whatsappHabilitado: false,
  whatsappTelefono: '',
  whatsappApiKey: '',
  reglas: reglasPorDefecto(),
};

/** Combina reglas parciales/desconocidas con los defaults, sin perder eventos no enviados. */
export function sanearReglas(v: unknown): MatrizReglas {
  const base = reglasPorDefecto();
  if (v && typeof v === 'object') {
    for (const evento of EVENTOS_NOTIFICABLES) {
      const r = (v as Record<string, unknown>)[evento];
      if (r && typeof r === 'object') {
        base[evento] = {
          webhook: Boolean((r as Record<string, unknown>).webhook),
          whatsapp: Boolean((r as Record<string, unknown>).whatsapp),
        };
      }
    }
  }
  return base;
}
