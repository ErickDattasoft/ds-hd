/** Eventos de dominio que pueden disparar una notificación externa. */
export const EVENTOS_NOTIFICABLES = [
  'ticket.creado',
  'ticket.asignado',
  'ticket.resuelto',
  'ticket.cerrado',
  'ticket.facturado',
  'ticket.cerrado_facturado',
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
  'ticket.cerrado_facturado': 'Ticket cerrado Y facturado (una sola vez)',
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
  /** Webhook para "Avisar por WhatsApp" desde Empresas — CallMeBot no sirve para esto (solo
   * manda al número propio dado de alta), así que este evento se manda tal cual a n8n para
   * que ahí se enrute a un proveedor real de WhatsApp Business. */
  n8nWebhookEmpresas: string;
  whatsappHabilitado: boolean;
  whatsappTelefono: string;
  whatsappApiKey: string;
  /** Más personas del equipo que reciben los avisos (cada una con su propia API key de CallMeBot). */
  whatsappOtros?: DestinatarioWhatsApp[];
  /** WhatsApp a CLIENTES (avisos de versiones/licencias). */
  whatsappClientes?: WhatsAppClientesConfig;
  reglas: MatrizReglas;
}

/**
 * Cómo se manda WhatsApp a clientes: `manual` abre WhatsApp Web con el mensaje listo,
 * `n8n` lo manda al webhook de Empresas, `meta` usa la API oficial (Cloud API) y `twilio` la de Twilio.
 */
export type ProveedorWhatsAppClientes = 'manual' | 'n8n' | 'meta' | 'twilio';

/** Credenciales y proveedor del WhatsApp a clientes. */
export interface WhatsAppClientesConfig {
  proveedor: ProveedorWhatsAppClientes;
  /** Meta: token permanente de usuario de sistema, id del número y plantilla aprobada. */
  metaToken: string;
  metaPhoneNumberId: string;
  metaPlantilla: string;
  metaIdioma: string;
  /** Twilio: credenciales, número remitente y (opcional) plantilla de Content API. */
  twilioAccountSid: string;
  twilioAuthToken: string;
  twilioFrom: string;
  twilioContentSid: string;
}

export const WHATSAPP_CLIENTES_POR_DEFECTO: WhatsAppClientesConfig = {
  // `n8n` sin webhook configurado se comporta como `manual` (así funcionaba antes de esta opción).
  proveedor: 'n8n',
  metaToken: '',
  metaPhoneNumberId: '',
  metaPlantilla: '',
  metaIdioma: 'es_MX',
  twilioAccountSid: '',
  twilioAuthToken: '',
  twilioFrom: '',
  twilioContentSid: '',
};

/** Una persona que recibe avisos por WhatsApp vía CallMeBot. */
export interface DestinatarioWhatsApp {
  nombre: string;
  telefono: string;
  apiKey: string;
}

/** Parsea "Nombre, +521234567890, APIKEY" (uno por línea; también acepta | o tabulador). */
export function parsearDestinatariosWhatsApp(texto: string): DestinatarioWhatsApp[] {
  return String(texto ?? '')
    .split(/\r?\n/)
    .map((l) => l.split(/[,|\t]/).map((p) => p.trim()))
    .filter((p) => p.length >= 3 && p[1] && p[2])
    .map(([nombre, telefono, apiKey]) => ({ nombre: nombre!, telefono: telefono!, apiKey: apiKey! }));
}

/** Formato de texto (una línea por persona) para editar en un textarea. */
export function destinatariosWhatsAppATexto(lista: DestinatarioWhatsApp[] | undefined): string {
  return (lista ?? []).map((d) => `${d.nombre}, ${d.telefono}, ${d.apiKey}`).join('\n');
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
  n8nWebhookEmpresas: '',
  whatsappHabilitado: false,
  whatsappTelefono: '',
  whatsappApiKey: '',
  whatsappOtros: [],
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
