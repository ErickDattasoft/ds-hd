import type { Evento } from '../../entities/Evento.js';
import type { EntradaListaNegra, Inscripcion } from '../../entities/Inscripcion.js';

export interface IEventoRepository {
  findById(id: string): Promise<Evento | null>;
  list(soloPublicados?: boolean): Promise<Evento[]>;
  /** Eventos publicados cuya fecha cae dentro de la ventana [desde, hasta]. */
  proximos(desde: Date, hasta: Date): Promise<Evento[]>;
  save(evento: Evento): Promise<void>;
}

export interface IInscripcionRepository {
  create(inscripcion: Inscripcion): Promise<void>;
  findByEmail(eventoId: string, email: string): Promise<Inscripcion | null>;
  listPorEvento(eventoId: string): Promise<Inscripcion[]>;
  contar(eventoId: string): Promise<number>;
  save(inscripcion: Inscripcion): Promise<void>;
}

export interface IListaNegraRepository {
  contiene(email: string): Promise<boolean>;
  list(): Promise<EntradaListaNegra[]>;
  agregar(entrada: EntradaListaNegra): Promise<void>;
  quitar(email: string): Promise<void>;
}
