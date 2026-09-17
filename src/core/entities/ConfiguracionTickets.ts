import { PRIORIDADES, SLA_HORAS_POR_DEFECTO, type Prioridad } from './value-objects/Prioridad.js';
import { ESTADOS_POR_DEFECTO } from './value-objects/EstadoTicket.js';

/** Catálogos configurables del módulo de tickets (documento `configuracion/tickets`). */
export interface ConfiguracionTickets {
  tipos: string[];
  sistemas: string[];
  grupos: string[];
  estados: string[];
  prioridades: string[];
  /** Horas objetivo de SLA por prioridad. */
  slaHoras: Record<string, number>;
  /** Tipos de ticket que ameritan facturación. */
  tiposFacturables: string[];
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
}

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
  estados: [...ESTADOS_POR_DEFECTO],
  prioridades: [...PRIORIDADES],
  slaHoras: { ...SLA_HORAS_POR_DEFECTO },
  tiposFacturables: ['Consultoría Sitio', 'Consultoría Remoto'],
  estadoInicial: 'Abierto',
  correosNotificacion: [],
  avisarClienteEstados: [],
  predeterminados: { prioridad: 'Media', estadoFacturacion: 'no_facturado' },
};

/** Horas de SLA para una prioridad según la config (con fallback al valor por defecto). */
export function horasSlaDe(config: ConfiguracionTickets, prioridad: Prioridad): number {
  return config.slaHoras[prioridad] ?? SLA_HORAS_POR_DEFECTO[prioridad];
}
