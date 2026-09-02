import type { CanalTicket } from '../../core/entities/Ticket.js';
import type { Prioridad } from '../../core/entities/value-objects/Prioridad.js';
import type { SessionUser } from '../shared/SessionUser.js';

/** Datos para crear un ticket desde cualquier canal (staff, portal o público). */
export interface CrearTicketInput {
  actor: SessionUser;
  asunto: string;
  descripcion: string;
  tipo: string;
  prioridad: Prioridad;
  sistema?: string | null;
  grupo?: string | null;
  canal?: CanalTicket;
  empresaId?: string | null;
  empresaNombre?: string | null;
  contactoId?: string | null;
  contactoNombre?: string | null;
  contactoCorreo?: string | null;
  solicitanteUid?: string | null;
  origenPublicoId?: string | null;
  /** El agente que crea se autoasigna. */
  asignarAlActor?: boolean;
}

/** Datos para transicionar el estado de un ticket, con nota opcional del cambio. */
export interface CambiarEstadoInput {
  actor: SessionUser;
  ticketId: string;
  nuevoEstado: string;
  nota?: string;
}

/** Datos para asignar un ticket a un agente. */
export interface AsignarAgenteInput {
  actor: SessionUser;
  ticketId: string;
  agenteUid: string;
  /** Ignora el límite de capacidad del agente. */
  forzar?: boolean;
}

/** Datos para agregar una nota (pública o interna) a un ticket. */
export interface RegistrarNotaInput {
  actor: SessionUser;
  ticketId: string;
  cuerpo: string;
  tipo: 'publica' | 'interna';
}
