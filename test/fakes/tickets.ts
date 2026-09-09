import type { ITicketRepository } from '../../src/core/ports/repositories/ITicketRepository.js';
import type {
  ITicketQueries,
  FiltroTickets,
  CargaAgente,
  ColumnaKanban,
} from '../../src/core/ports/repositories/ITicketQueries.js';
import type { IContadorRepository } from '../../src/core/ports/repositories/IContadorRepository.js';
import type { IConfiguracionRepository } from '../../src/core/ports/repositories/IConfiguracionRepository.js';
import type { ITicketPublicoRepository } from '../../src/core/ports/repositories/ITicketPublicoRepository.js';
import type { ICaptchaVerifier } from '../../src/core/ports/services/ICaptchaVerifier.js';
import type { IWebhookPublisher, EventoWebhook } from '../../src/core/ports/services/IWebhookPublisher.js';
import type { Ticket } from '../../src/core/entities/Ticket.js';
import type { EventoTicket, NotaTicket } from '../../src/core/entities/NotaTicket.js';
import type { TicketPublico } from '../../src/core/entities/TicketPublico.js';
import {
  CONFIG_TICKETS_POR_DEFECTO,
  type ConfiguracionTickets,
} from '../../src/core/entities/ConfiguracionTickets.js';
import {
  CONFIG_CALCULADORA_POR_DEFECTO,
  type ConfiguracionCalculadora,
} from '../../src/core/entities/CalculadoraCompac.js';
import {
  CONFIG_AVISOS_POR_DEFECTO,
  type ConfiguracionAvisos,
} from '../../src/core/entities/ConfiguracionAvisos.js';
import {
  CONFIG_INTEGRACIONES_POR_DEFECTO,
  type ConfiguracionIntegraciones,
} from '../../src/core/entities/ConfiguracionIntegraciones.js';
import {
  CONFIG_COTIZACIONES_POR_DEFECTO,
  type ConfiguracionCotizaciones,
} from '../../src/core/entities/ConfiguracionCotizaciones.js';
import { ACERCA_DE_POR_DEFECTO, type AcercaDe } from '../../src/core/entities/AcercaDe.js';
import { esEstadoFinal, slugEstado } from '../../src/core/entities/value-objects/EstadoTicket.js';

/** Almacén compartido por el repo y las queries en memoria. */
export class InMemoryTicketStore {
  readonly tickets = new Map<string, Ticket>();
  readonly notas = new Map<string, NotaTicket[]>();
  readonly eventos = new Map<string, EventoTicket[]>();
}

export class InMemoryTicketRepository implements ITicketRepository {
  constructor(private readonly store: InMemoryTicketStore) {}

  async findById(id: string): Promise<Ticket | null> {
    return this.store.tickets.get(id) ?? null;
  }
  async findByNumero(numero: number): Promise<Ticket | null> {
    return [...this.store.tickets.values()].find((t) => t.numero === numero) ?? null;
  }
  async save(ticket: Ticket): Promise<void> {
    this.store.tickets.set(ticket.id, ticket);
  }
  async eliminar(id: string): Promise<void> {
    this.store.tickets.delete(id);
    this.store.notas.delete(id);
    this.store.eventos.delete(id);
  }
  async agregarNota(ticketId: string, nota: NotaTicket): Promise<void> {
    const lista = this.store.notas.get(ticketId) ?? [];
    lista.push(nota);
    this.store.notas.set(ticketId, lista);
  }
  async listarNotas(ticketId: string): Promise<NotaTicket[]> {
    return [...(this.store.notas.get(ticketId) ?? [])].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );
  }
  async registrarEvento(ticketId: string, evento: EventoTicket): Promise<void> {
    const lista = this.store.eventos.get(ticketId) ?? [];
    lista.push(evento);
    this.store.eventos.set(ticketId, lista);
  }
  async listarEventos(ticketId: string): Promise<EventoTicket[]> {
    return [...(this.store.eventos.get(ticketId) ?? [])].sort((a, b) => a.at.getTime() - b.at.getTime());
  }
}

export class InMemoryTicketQueries implements ITicketQueries {
  constructor(private readonly store: InMemoryTicketStore) {}

  private match(t: Ticket, f: FiltroTickets): boolean {
    if (f.estado && t.estado !== f.estado) return false;
    if (f.prioridad && t.prioridad !== f.prioridad) return false;
    if (f.grupo && t.grupo !== f.grupo) return false;
    if (f.agenteAsignadoUid && t.agenteAsignadoUid !== f.agenteAsignadoUid) return false;
    if (f.sinAsignar && t.agenteAsignadoUid) return false;
    if (f.empresaId && t.empresaId !== f.empresaId) return false;
    if (f.solicitanteUid && t.solicitanteUid !== f.solicitanteUid) return false;
    if (f.canal && t.canal !== f.canal) return false;
    if (f.soloAbiertos && esEstadoFinal(t.estado)) return false;
    if (f.soloProgramados && t.fechaHoraProgramada === null) return false;
    if (f.archivado !== undefined && t.archivado !== f.archivado) return false;
    if (f.texto) {
      const q = f.texto.toLowerCase();
      if (
        !t.asunto.toLowerCase().includes(q) &&
        !String(t.numero).includes(q) &&
        !(t.empresaNombre ?? '').toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    return true;
  }

  async listar(filtro: FiltroTickets): Promise<Ticket[]> {
    const out = [...this.store.tickets.values()]
      .filter((t) => this.match(t, filtro))
      .sort((a, b) =>
        filtro.soloProgramados
          ? a.fechaHoraProgramada!.getTime() - b.fechaHoraProgramada!.getTime()
          : b.numero - a.numero,
      );
    return filtro.limite ? out.slice(0, filtro.limite) : out;
  }
  async contar(filtro: FiltroTickets): Promise<number> {
    return (await this.listar(filtro)).length;
  }
  async tablero(filtro: FiltroTickets, estados: readonly string[]): Promise<ColumnaKanban[]> {
    const tickets = await this.listar({ ...filtro, soloAbiertos: true });
    return estados
      .filter((e) => !esEstadoFinal(e))
      .map((estado) => ({
        estado,
        tickets: tickets.filter((t) => slugEstado(t.estado) === slugEstado(estado)),
      }));
  }
  async cargaPorAgente(
    agentes: { uid: string; nombre: string; grupo: string | null; capacidadMax: number; disponibleAsignacion: boolean }[],
    ahora: Date,
  ): Promise<CargaAgente[]> {
    return agentes.map((a) => {
      const suyos = [...this.store.tickets.values()].filter(
        (t) => t.agenteAsignadoUid === a.uid && !esEstadoFinal(t.estado),
      );
      return {
        agenteUid: a.uid,
        agenteNombre: a.nombre,
        grupo: a.grupo,
        capacidadMax: a.capacidadMax,
        disponibleAsignacion: a.disponibleAsignacion,
        abiertos: suyos.length,
        vencidos: suyos.filter((t) => t.estaVencido(ahora)).length,
      };
    });
  }
}

export class InMemoryContadorRepository implements IContadorRepository {
  private readonly valores = new Map<string, number>();
  async siguiente(nombre: string): Promise<number> {
    const n = (this.valores.get(nombre) ?? 0) + 1;
    this.valores.set(nombre, n);
    return n;
  }
  async fijar(nombre: string, valor: number): Promise<void> {
    this.valores.set(nombre, valor);
  }
}

export class InMemoryConfiguracionRepository implements IConfiguracionRepository {
  config: ConfiguracionTickets = { ...CONFIG_TICKETS_POR_DEFECTO };
  calculadora: ConfiguracionCalculadora = { ...CONFIG_CALCULADORA_POR_DEFECTO };
  avisos: ConfiguracionAvisos = { ...CONFIG_AVISOS_POR_DEFECTO };
  async obtenerTickets(): Promise<ConfiguracionTickets> {
    return this.config;
  }
  async guardarTickets(config: ConfiguracionTickets): Promise<void> {
    this.config = config;
  }
  async obtenerCalculadora(): Promise<ConfiguracionCalculadora> {
    return this.calculadora;
  }
  async guardarCalculadora(config: ConfiguracionCalculadora): Promise<void> {
    this.calculadora = config;
  }
  async obtenerAvisos(): Promise<ConfiguracionAvisos> {
    return this.avisos;
  }
  async guardarAvisos(config: ConfiguracionAvisos): Promise<void> {
    this.avisos = config;
  }
  integraciones: ConfiguracionIntegraciones = { ...CONFIG_INTEGRACIONES_POR_DEFECTO };
  async obtenerIntegraciones(): Promise<ConfiguracionIntegraciones> {
    return this.integraciones;
  }
  async guardarIntegraciones(config: ConfiguracionIntegraciones): Promise<void> {
    this.integraciones = config;
  }
  cotizaciones: ConfiguracionCotizaciones = { ...CONFIG_COTIZACIONES_POR_DEFECTO };
  async obtenerCotizaciones(): Promise<ConfiguracionCotizaciones> {
    return this.cotizaciones;
  }
  async guardarCotizaciones(config: ConfiguracionCotizaciones): Promise<void> {
    this.cotizaciones = config;
  }
  acercaDe: AcercaDe = { ...ACERCA_DE_POR_DEFECTO };
  async obtenerAcercaDe(): Promise<AcercaDe> {
    return this.acercaDe;
  }
  async guardarAcercaDe(config: AcercaDe): Promise<void> {
    this.acercaDe = config;
  }
}

export class InMemoryTicketPublicoRepository implements ITicketPublicoRepository {
  readonly items = new Map<string, TicketPublico>();
  private seq = 0;
  async create(
    data: Omit<TicketPublico, 'id' | 'estado' | 'ticketNumero' | 'createdAt'>,
  ): Promise<TicketPublico> {
    const t: TicketPublico = {
      id: `pub-${++this.seq}`,
      ...data,
      estado: 'pendiente',
      ticketNumero: null,
      createdAt: new Date(),
    };
    this.items.set(t.id, t);
    return t;
  }
  async findById(id: string): Promise<TicketPublico | null> {
    return this.items.get(id) ?? null;
  }
  async listPendientes(): Promise<TicketPublico[]> {
    return [...this.items.values()].filter((t) => t.estado === 'pendiente');
  }
  async marcarAceptado(id: string, ticketNumero: number): Promise<void> {
    const t = this.items.get(id);
    if (t) {
      t.estado = 'aceptado';
      t.ticketNumero = ticketNumero;
    }
  }
  async marcarRechazado(id: string): Promise<void> {
    const t = this.items.get(id);
    if (t) t.estado = 'rechazado';
  }
}

export class FakeWebhookPublisher implements IWebhookPublisher {
  readonly publicados: EventoWebhook[] = [];
  async publicar(evento: EventoWebhook): Promise<void> {
    this.publicados.push(evento);
  }
  get eventos(): string[] {
    return this.publicados.map((e) => e.evento);
  }
}

export class FakeCaptchaVerifier implements ICaptchaVerifier {
  respuesta = true;
  async verificar(): Promise<boolean> {
    return this.respuesta;
  }
}
