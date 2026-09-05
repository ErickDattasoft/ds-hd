import type { Evento } from '../../entities/Evento.js';
import type { EntradaListaNegra, Inscripcion } from '../../entities/Inscripcion.js';

/** Persistencia de eventos/webinars (`eventos/{id}`). */
export interface IEventoRepository {
  findById(id: string): Promise<Evento | null>;
  list(soloPublicados?: boolean): Promise<Evento[]>;
  /** Eventos publicados cuya fecha cae dentro de la ventana [desde, hasta]. */
  proximos(desde: Date, hasta: Date): Promise<Evento[]>;
  save(evento: Evento): Promise<void>;
}

/** Persistencia de inscripciones a eventos (subcolección de cada evento). */
export interface IInscripcionRepository {
  create(inscripcion: Inscripcion): Promise<void>;
  findByEmail(eventoId: string, email: string): Promise<Inscripcion | null>;
  /** Busca una inscripción por id en cualquier evento (collection-group). Para el webhook de Brevo. */
  findGlobal(inscripcionId: string): Promise<Inscripcion | null>;
  listPorEvento(eventoId: string): Promise<Inscripcion[]>;
  contar(eventoId: string): Promise<number>;
  /** Cuántas inscripciones a este evento vienen de una IP dada (para el límite antiabuso). */
  contarPorIp(eventoId: string, ip: string): Promise<number>;
  save(inscripcion: Inscripcion): Promise<void>;
}

/** Persistencia de la lista negra de correos bloqueados para registro a eventos. */
export interface IListaNegraRepository {
  contiene(email: string): Promise<boolean>;
  list(): Promise<EntradaListaNegra[]>;
  agregar(entrada: EntradaListaNegra): Promise<void>;
  quitar(email: string): Promise<void>;
}
