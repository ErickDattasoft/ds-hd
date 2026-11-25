import { PRIORIDADES, SLA_HORAS_POR_DEFECTO, type Prioridad } from './value-objects/Prioridad.js';
import { ESTADOS_POR_DEFECTO } from './value-objects/EstadoTicket.js';
import { DISTRIBUIDOR_POR_DEFECTO, normalizarDistribuidor } from './Ticket.js';
import { CATALOGO_FACTURACION_POR_DEFECTO } from './value-objects/EstadoFacturacion.js';

/** Catálogos configurables del módulo de tickets (documento `configuracion/tickets`). */
export interface ConfiguracionTickets {
  tipos: string[];
  sistemas: string[];
  grupos: string[];
  /** Distribuidores que atienden tickets (DATTASOFT siempre va primero; ver `distribuidoresDe`). */
  distribuidores?: string[];
  estados: string[];
  prioridades: string[];
  /** Horas objetivo de SLA por prioridad. */
  slaHoras: Record<string, number>;
  /** Tipos de ticket que ameritan facturación. */
  tiposFacturables: string[];
  /** Estados de facturación que se pueden elegir (editable; ver `opcionesFacturacion`). */
  facturacion?: string[];
  /** Estado con el que nace un ticket nuevo. */
  estadoInicial: string;
  /** Correos que se notifican al llegar un ticket del portal público. */
  correosNotificacion: string[];
  /** Valores con los que nace el formulario de ticket nuevo (⭐ en Configuración → Tickets). */
  predeterminados?: PredeterminadosTicket;
  /**
   * Estados que, al aplicarse, mandan un correo de avance al cliente. Resuelto y cerrado ya
   * avisan siempre (con la encuesta), así que aquí se marcan los intermedios ("En proceso").
   */
  avisarClienteEstados?: string[];
  /** Respuestas guardadas (macros) que se insertan al redactar. */
  respuestas?: RespuestaGuardada[];
  /**
   * Quién recibe los avisos de cierre y de facturado, persona por persona. Sin definir (nadie lo
   * ha guardado aún) = la lista `correosNotificacion` recibe los dos, como antes.
   */
  avisosCierre?: AvisoCierre[];
  /**
   * 👤 Qué correos AUTOMÁTICOS le llegan al cliente. Sin definir = todos (como antes). Las
   * respuestas que se le escriben en «💬 Respuestas al cliente» siempre le llegan.
   */
  avisosCliente?: AvisosCliente;
}

/** Los correos automáticos al cliente que se pueden apagar. */
export interface AvisosCliente {
  /** 🆕 Correo del ticket nuevo (al crearlo con «✉️ Enviar correo» o desde la Captura rápida). */
  nuevo: boolean;
  /** 📈 Aviso de avance al pasar a un estado intermedio («En proceso»…). */
  avances: boolean;
  /** ✔️ Aviso de resuelto/cerrado (con la encuesta). */
  cerrado: boolean;
}

/** ¿Se le manda al cliente este correo automático? (sin configurar = sí, como siempre) */
export function avisaCliente(config: Pick<ConfiguracionTickets, 'avisosCliente'>, tipo: keyof AvisosCliente): boolean {
  return config.avisosCliente?.[tipo] !== false;
}

/** Un renglón de «¿Quién recibe los avisos de cierre?»: a quién y cuáles de los dos. */
export interface AvisoCierre {
  correo: string;
  /** Copia del correo de resuelto/cerrado que se le manda al cliente. */
  cerrado: boolean;
  /** Aviso interno «✅ Ticket #N cerrado [FACTURADO]». */
  facturado: boolean;
  /**
   * 🆕 Copia del correo de ticket nuevo (y reenvíos) y aviso de ticket del portal público.
   * Sin definir = lo que diga la lista «Correos de notificación» (como antes).
   */
  nuevo?: boolean;
  /**
   * 💬 Copia de las respuestas que se le mandan al cliente, y aviso cuando el cliente contesta.
   * Sin definir = lo que diga la lista «Correos de notificación» (como antes).
   */
  respuestas?: boolean;
  /**
   * 📈 Copia del aviso de avance que recibe el cliente cuando su ticket pasa a un estado intermedio
   * («En proceso»…). Sin definir = igual que `respuestas` (antes iban juntos).
   */
  avances?: boolean;
}

/** Las copias que se eligen persona por persona además de cerrado/facturado. */
export type TipoCopiaEquipo = 'nuevo' | 'respuestas' | 'avances';

/** La casilla de esa persona para ese tipo; «avances» sin elegir sigue a «respuestas» (antes iban juntos). */
function eleccion(a: AvisoCierre | undefined, tipo: TipoCopiaEquipo): boolean | undefined {
  if (!a) return undefined;
  if (tipo === 'avances') return a.avances ?? a.respuestas;
  return a[tipo];
}

const correoOk = (c: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.trim());

/**
 * Quién del equipo recibe copia de un tipo de correo. Parte de «Correos de notificación» y aplica
 * lo elegido en la tabla «¿Quién recibe qué avisos?»: una palomita quitada saca a esa persona y una
 * puesta la agrega. Quien no tiene renglón (o no lo ha elegido) sigue como antes.
 */
export function correosCopia(
  config: Pick<ConfiguracionTickets, 'avisosCierre' | 'correosNotificacion'>,
  tipo: TipoCopiaEquipo,
): string[] {
  const filas = new Map((config.avisosCierre ?? []).map((a) => [a.correo.trim().toLowerCase(), a]));
  const out: string[] = [];
  const vistos = new Set<string>();
  const agregar = (c: string): void => {
    const k = c.trim().toLowerCase();
    if (!correoOk(c) || vistos.has(k)) return;
    vistos.add(k);
    out.push(c.trim());
  };
  for (const c of config.correosNotificacion) if (eleccion(filas.get(c.trim().toLowerCase()), tipo) !== false) agregar(c);
  for (const a of config.avisosCierre ?? []) if (eleccion(a, tipo) === true) agregar(a.correo);
  return out;
}

/**
 * Renglones para la tabla de Configuración: los guardados más quien está en «Correos de
 * notificación» y aún no tiene renglón, con cada casilla como funciona HOY para esa persona.
 */
export function avisosParaTabla(
  config: Pick<ConfiguracionTickets, 'avisosCierre' | 'correosNotificacion'>,
): Required<AvisoCierre>[] {
  const nuevo = new Set(correosCopia(config, 'nuevo').map((c) => c.toLowerCase()));
  const resp = new Set(correosCopia(config, 'respuestas').map((c) => c.toLowerCase()));
  const avances = new Set(correosCopia(config, 'avances').map((c) => c.toLowerCase()));
  const filas = avisosCierreDe(config).map((a) => ({ ...a }));
  const ya = new Set(filas.map((a) => a.correo.trim().toLowerCase()));
  for (const c of config.correosNotificacion) {
    if (!correoOk(c) || ya.has(c.trim().toLowerCase())) continue;
    ya.add(c.trim().toLowerCase());
    filas.push({ correo: c.trim(), cerrado: false, facturado: false });
  }
  return filas.map((a) => ({
    correo: a.correo,
    cerrado: a.cerrado,
    facturado: a.facturado,
    nuevo: nuevo.has(a.correo.trim().toLowerCase()),
    respuestas: resp.has(a.correo.trim().toLowerCase()),
    avances: avances.has(a.correo.trim().toLowerCase()),
  }));
}

/** Los renglones de avisos de cierre; si nunca se han guardado, la lista de notificación con ambos. */
export function avisosCierreDe(config: Pick<ConfiguracionTickets, 'avisosCierre' | 'correosNotificacion'>): AvisoCierre[] {
  if (config.avisosCierre) return config.avisosCierre;
  return config.correosNotificacion
    .map((c) => c.trim())
    .filter((c) => c.includes('@'))
    .map((correo) => ({ correo, cerrado: true, facturado: true }));
}

/** Correos que reciben copia del aviso de resuelto/cerrado. */
export function correosAvisoCerrado(config: Pick<ConfiguracionTickets, 'avisosCierre' | 'correosNotificacion'>): string[] {
  return avisosCierreDe(config).filter((a) => a.cerrado).map((a) => a.correo);
}

/** Correos que reciben el aviso «[FACTURADO]» (ticket cerrado y facturado). */
export function correosAvisoFacturado(config: Pick<ConfiguracionTickets, 'avisosCierre' | 'correosNotificacion'>): string[] {
  return avisosCierreDe(config).filter((a) => a.facturado).map((a) => a.correo);
}

/** Texto reutilizable para responder casos repetidos. */
export interface RespuestaGuardada {
  titulo: string;
  texto: string;
}

/** Parsea bloques "### Título" seguidos de su texto. */
export function parsearRespuestas(texto: string): RespuestaGuardada[] {
  const out: RespuestaGuardada[] = [];
  let actual: RespuestaGuardada | null = null;
  for (const linea of String(texto ?? '').split(/\r?\n/)) {
    const m = /^###\s*(.+)$/.exec(linea);
    if (m) {
      actual = { titulo: m[1]!.trim(), texto: '' };
      out.push(actual);
    } else if (actual) {
      actual.texto += (actual.texto ? '\n' : '') + linea;
    }
  }
  return out
    .map((r) => ({ titulo: r.titulo, texto: r.texto.trim() }))
    .filter((r) => r.titulo && r.texto);
}

/** Inverso de {@link parsearRespuestas}, para editar en un textarea. */
export function respuestasATexto(lista: RespuestaGuardada[] | undefined): string {
  return (lista ?? []).map((r) => `### ${r.titulo}\n${r.texto}`).join('\n\n');
}

/** Valores predeterminados del formulario de ticket nuevo; vacío = sin preselección. */
export interface PredeterminadosTicket {
  tipo?: string;
  prioridad?: string;
  sistema?: string;
  grupo?: string;
  estadoFacturacion?: string;
  /** Ticket nuevo nace asignado a quien lo crea (si es técnico). */
  asignarAlCreador?: boolean;
  /** Agente fijo con el que nace el ticket (el «Agente» predeterminado del CRM viejo); vacío = sin asignar. */
  agenteUid?: string;
}

/** Con los que arranca el catálogo mientras nadie lo haya editado en Configuración → Tickets. */
export const DISTRIBUIDORES_INICIALES: readonly string[] = [DISTRIBUIDOR_POR_DEFECTO, 'ALFONSO', 'TONY', 'XELCRON'];

export const CONFIG_TICKETS_POR_DEFECTO: ConfiguracionTickets = {
  tipos: [
    'General',
    'Soporte Técnico',
    'Consultoría Sitio',
    'Consultoría Remoto',
    'Instalación',
    'Correo Electrónico',
  ],
  sistemas: ['Contabilidad', 'Bancos', 'Nóminas', 'Comercial Premium', 'Comercial Pro', 'Factura Electrónica'],
  grupos: ['Soporte', 'Ventas', 'Sistemas', 'Otros'],
  distribuidores: [...DISTRIBUIDORES_INICIALES],
  estados: [...ESTADOS_POR_DEFECTO],
  prioridades: [...PRIORIDADES],
  slaHoras: { ...SLA_HORAS_POR_DEFECTO },
  tiposFacturables: ['Consultoría Sitio', 'Consultoría Remoto'],
  facturacion: [...CATALOGO_FACTURACION_POR_DEFECTO],
  estadoInicial: 'Abierto',
  correosNotificacion: [],
  avisarClienteEstados: [],
  predeterminados: { prioridad: 'Media', estadoFacturacion: 'no_facturado' },
};

/** El catálogo de distribuidores, normalizado, sin repetidos y con DATTASOFT siempre primero. */
export function distribuidoresDe(config: Pick<ConfiguracionTickets, 'distribuidores'>): string[] {
  const lista = (config.distribuidores ?? []).map(normalizarDistribuidor);
  return [...new Set([DISTRIBUIDOR_POR_DEFECTO, ...lista])];
}

/** Horas de SLA para una prioridad según la config (con fallback al valor por defecto). */
export function horasSlaDe(config: ConfiguracionTickets, prioridad: Prioridad): number {
  return config.slaHoras[prioridad] ?? SLA_HORAS_POR_DEFECTO[prioridad];
}
