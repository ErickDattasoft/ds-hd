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
};

/** Horas de SLA para una prioridad según la config (con fallback al valor por defecto). */
export function horasSlaDe(config: ConfiguracionTickets, prioridad: Prioridad): number {
  return config.slaHoras[prioridad] ?? SLA_HORAS_POR_DEFECTO[prioridad];
}
