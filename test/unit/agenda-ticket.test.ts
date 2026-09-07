import { beforeEach, describe, expect, it } from 'vitest';
import { CrearTicketService } from '../../src/application/tickets/CrearTicketService.js';
import { ProgramarAtencionService } from '../../src/application/tickets/ProgramarAtencionService.js';
import { parseAgenda, sanearAgenda } from '../../src/core/entities/value-objects/AgendaTicket.js';
import { ValidationError } from '../../src/core/errors/DomainError.js';
import type { SessionUser } from '../../src/application/shared/SessionUser.js';
import {
  InMemoryTicketStore,
  InMemoryTicketRepository,
  InMemoryTicketQueries,
  InMemoryContadorRepository,
  InMemoryConfiguracionRepository,
  FakeWebhookPublisher,
} from '../fakes/tickets.js';
import { FixedClock, silentLogger } from '../fakes/support.js';

let seq = 0;
const ids = { newId: () => `id-${++seq}`, newToken: () => `tok-${++seq}` };

const actor = (over: Partial<SessionUser> = {}): SessionUser => ({
  uid: 'sup',
  nombre: 'Supervisor',
  email: 's@d.com',
  roles: ['supervisor'],
  rol: 'supervisor',
  esTecnico: false,
  empresaId: null,
  activo: true,
  esStaff: true,
  esCliente: false,
  permisos: ['tickets:crear', 'tickets:editar', 'tickets:leer_todos'],
  ...over,
});

describe('AgendaTicket (value object)', () => {
  it('valida fecha y hora, con hora por defecto 09:00', () => {
    expect(parseAgenda({ fecha: '2026-10-15', hora: '', recordatorioWhatsapp: true })).toEqual({
      fecha: '2026-10-15',
      hora: '09:00',
      recordatorioWhatsapp: true,
    });
    expect(() => parseAgenda({ fecha: '15/10/2026', hora: '10:00', recordatorioWhatsapp: false })).toThrow(ValidationError);
    expect(() => parseAgenda({ fecha: '2026-13-40', hora: '10:00', recordatorioWhatsapp: false })).toThrow(ValidationError);
  });

  it('sanea props/Firestore y descarta lo malformado', () => {
    expect(sanearAgenda({ fecha: '2026-10-15', hora: '14:30', recordatorioWhatsapp: true })).toEqual({
      fecha: '2026-10-15',
      hora: '14:30',
      recordatorioWhatsapp: true,
    });
    expect(sanearAgenda(null)).toBeNull();
    expect(sanearAgenda({ hora: '14:30' })).toBeNull();
  });
});

describe('agenda del ticket', () => {
  let store: InMemoryTicketStore;
  let clock: FixedClock;
  let webhooks: FakeWebhookPublisher;
  let repo: InMemoryTicketRepository;
  let queries: InMemoryTicketQueries;
  let crear: CrearTicketService;
  let programar: ProgramarAtencionService;

  beforeEach(() => {
    seq = 0;
    store = new InMemoryTicketStore();
    clock = new FixedClock(new Date('2026-09-01T09:00:00Z'));
    webhooks = new FakeWebhookPublisher();
    repo = new InMemoryTicketRepository(store);
    queries = new InMemoryTicketQueries(store);
    crear = new CrearTicketService(
      repo,
      new InMemoryContadorRepository(),
      new InMemoryConfiguracionRepository(),
      ids,
      clock,
      webhooks,
      silentLogger,
    );
    programar = new ProgramarAtencionService(repo, ids, clock, webhooks);
  });

  const nuevoTicket = () =>
    crear.ejecutar({
      actor: actor(),
      asunto: 'Con agenda',
      descripcion: 'hay que agendar la visita',
      tipo: 'General',
      prioridad: 'Media',
    });

  it('el alta captura la agenda y dispara ticket.programado solo si pide recordatorio', async () => {
    const t = await crear.ejecutar({
      actor: actor(),
      asunto: 'Visita en sitio',
      descripcion: 'programar visita técnica',
      tipo: 'General',
      prioridad: 'Media',
      agenda: { fecha: '2026-09-10', hora: '10:00', recordatorioWhatsapp: true },
    });
    expect(t.agenda).toEqual({ fecha: '2026-09-10', hora: '10:00', recordatorioWhatsapp: true });
    expect(webhooks.eventos).toEqual(['ticket.creado', 'ticket.programado']);
  });

  it('programar, reprogramar y cancelar registran evento y notifican', async () => {
    const t = await nuevoTicket();
    webhooks.publicados.length = 0;

    await programar.ejecutar({ actor: actor(), ticketId: t.id, fecha: '2026-09-20', hora: '12:00', recordatorioWhatsapp: true });
    await programar.ejecutar({ actor: actor(), ticketId: t.id, fecha: '2026-09-21', hora: '08:30', recordatorioWhatsapp: true });
    await programar.ejecutar({ actor: actor(), ticketId: t.id, fecha: '', hora: '', recordatorioWhatsapp: false });

    expect(webhooks.publicados.map((e) => e.payload.accion)).toEqual(['programar', 'reprogramar', 'cancelar']);
    const guardado = await repo.findById(t.id);
    expect(guardado?.agenda).toBeNull();
    const eventos = (await repo.listarEventos(t.id)).filter((e) => e.tipo === 'agenda');
    expect(eventos).toHaveLength(3);
  });

  it('no notifica si no se pide recordatorio', async () => {
    const t = await nuevoTicket();
    webhooks.publicados.length = 0;
    await programar.ejecutar({ actor: actor(), ticketId: t.id, fecha: '2026-09-20', hora: '12:00', recordatorioWhatsapp: false });
    expect(webhooks.publicados).toHaveLength(0);
  });

  it('agendaVencida es true si la fecha pasó y el ticket sigue abierto', async () => {
    const t = await nuevoTicket();
    await programar.ejecutar({ actor: actor(), ticketId: t.id, fecha: '2026-08-01', hora: '09:00', recordatorioWhatsapp: false });
    const guardado = await repo.findById(t.id);
    expect(guardado?.agendaVencida(clock.now())).toBe(true);
  });

  it('el filtro soloProgramados devuelve solo agendados, ordenados por fecha/hora', async () => {
    const a = await nuevoTicket();
    const b = await nuevoTicket();
    await nuevoTicket(); // sin agenda
    await programar.ejecutar({ actor: actor(), ticketId: a.id, fecha: '2026-09-25', hora: '09:00', recordatorioWhatsapp: false });
    await programar.ejecutar({ actor: actor(), ticketId: b.id, fecha: '2026-09-20', hora: '09:00', recordatorioWhatsapp: false });

    const lista = await queries.listar({ soloProgramados: true });
    expect(lista.map((t) => t.id)).toEqual([b.id, a.id]);
  });

  it('rechaza a quien no puede editar tickets', async () => {
    const t = await nuevoTicket();
    await expect(
      programar.ejecutar({ actor: actor({ permisos: ['tickets:leer'] }), ticketId: t.id, fecha: '2026-09-20', hora: '12:00', recordatorioWhatsapp: false }),
    ).rejects.toThrow();
  });
});
