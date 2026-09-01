import { beforeEach, describe, expect, it } from 'vitest';
import { CrearTicketService } from '../../src/application/tickets/CrearTicketService.js';
import { AsignarAgenteService } from '../../src/application/tickets/AsignarAgenteService.js';
import { ActualizarEstadoTicketService } from '../../src/application/tickets/ActualizarEstadoTicketService.js';
import { Usuario } from '../../src/core/entities/Usuario.js';
import { ConflictError } from '../../src/core/errors/DomainError.js';
import type { SessionUser } from '../../src/application/shared/SessionUser.js';
import {
  InMemoryTicketStore,
  InMemoryTicketRepository,
  InMemoryTicketQueries,
  InMemoryContadorRepository,
  InMemoryConfiguracionRepository,
  FakeWebhookPublisher,
} from '../fakes/tickets.js';
import { InMemoryUsuarioRepository } from '../fakes/InMemoryUsuarioRepository.js';
import { FakeEmailSender } from '../fakes/FakeEmailSender.js';
import { FixedClock, silentLogger } from '../fakes/support.js';

let seq = 0;
const ids = { newId: () => `id-${++seq}`, newToken: () => `tok-${++seq}` };

const actor = (over: Partial<SessionUser> = {}): SessionUser => ({
  uid: 'sup',
  nombre: 'Supervisor',
  email: 's@d.com',
  rol: 'supervisor',
  empresaId: null,
  activo: true,
  esStaff: true,
  esCliente: false,
  permisos: ['tickets:crear', 'tickets:asignar', 'tickets:cambiar_estado', 'tickets:leer_todos', 'tickets:editar'],
  ...over,
});

describe('CrearTicketService', () => {
  let store: InMemoryTicketStore;
  let clock: FixedClock;
  let webhooks: FakeWebhookPublisher;
  let service: CrearTicketService;

  beforeEach(() => {
    seq = 0;
    store = new InMemoryTicketStore();
    clock = new FixedClock(new Date('2026-09-01T09:00:00Z'));
    webhooks = new FakeWebhookPublisher();
    service = new CrearTicketService(
      new InMemoryTicketRepository(store),
      new InMemoryContadorRepository(),
      new InMemoryConfiguracionRepository(),
      ids,
      clock,
      webhooks,
      silentLogger,
    );
  });

  it('asigna folio consecutivo y estado inicial de la config', async () => {
    const t1 = await service.ejecutar({ actor: actor(), asunto: 'Uno', descripcion: 'detalle largo', tipo: 'General', prioridad: 'Media' });
    const t2 = await service.ejecutar({ actor: actor(), asunto: 'Dos', descripcion: 'detalle largo', tipo: 'General', prioridad: 'Media' });
    expect(t1.numero).toBe(1);
    expect(t2.numero).toBe(2);
    expect(t1.estado).toBe('Abierto');
    expect(webhooks.eventos).toEqual(['ticket.creado', 'ticket.creado']);
  });

  it('marca requiereFacturacion para tipos facturables', async () => {
    const t = await service.ejecutar({ actor: actor(), asunto: 'Consultoría', descripcion: 'trabajo en sitio', tipo: 'Consultoría Sitio', prioridad: 'Media' });
    expect(t.facturacion.requiere).toBe(true);
  });

  it('un agente puede autoasignarse al crear', async () => {
    const t = await service.ejecutar({
      actor: actor({ uid: 'ag1', rol: 'agente', nombre: 'Agente Uno' }),
      asunto: 'Autoasignado',
      descripcion: 'descripción válida',
      tipo: 'General',
      prioridad: 'Media',
      asignarAlActor: true,
    });
    expect(t.agenteAsignadoUid).toBe('ag1');
  });
});

describe('AsignarAgenteService', () => {
  let store: InMemoryTicketStore;
  let usuarios: InMemoryUsuarioRepository;
  let service: AsignarAgenteService;
  let crear: CrearTicketService;

  beforeEach(() => {
    seq = 0;
    store = new InMemoryTicketStore();
    const clock = new FixedClock(new Date('2026-09-01T09:00:00Z'));
    usuarios = new InMemoryUsuarioRepository([
      new Usuario({ uid: 'ag1', email: 'a1@d.com', nombre: 'Ana', rol: 'agente', agente: { capacidadMax: 1 } }),
    ]);
    const repo = new InMemoryTicketRepository(store);
    const queries = new InMemoryTicketQueries(store);
    crear = new CrearTicketService(repo, new InMemoryContadorRepository(), new InMemoryConfiguracionRepository(), ids, clock, new FakeWebhookPublisher(), silentLogger);
    service = new AsignarAgenteService(repo, queries, usuarios, ids, clock, new FakeEmailSender(), new FakeWebhookPublisher(), silentLogger);
  });

  it('respeta el límite de capacidad del agente y permite forzar', async () => {
    const t1 = await crear.ejecutar({ actor: actor(), asunto: 'Uno', descripcion: 'descripción', tipo: 'General', prioridad: 'Media' });
    const t2 = await crear.ejecutar({ actor: actor(), asunto: 'Dos', descripcion: 'descripción', tipo: 'General', prioridad: 'Media' });

    await service.ejecutar({ actor: actor(), ticketId: t1.id, agenteUid: 'ag1' });
    await expect(
      service.ejecutar({ actor: actor(), ticketId: t2.id, agenteUid: 'ag1' }),
    ).rejects.toThrow(ConflictError);

    await service.ejecutar({ actor: actor(), ticketId: t2.id, agenteUid: 'ag1', forzar: true });
    expect((await new InMemoryTicketRepository(store).findById(t2.id))?.agenteAsignadoUid).toBe('ag1');
  });
});

describe('ActualizarEstadoTicketService', () => {
  it('al cerrar envía correo al contacto y publica webhook', async () => {
    seq = 0;
    const store = new InMemoryTicketStore();
    const clock = new FixedClock(new Date('2026-09-01T09:00:00Z'));
    const repo = new InMemoryTicketRepository(store);
    const email = new FakeEmailSender();
    const webhooks = new FakeWebhookPublisher();
    const crear = new CrearTicketService(repo, new InMemoryContadorRepository(), new InMemoryConfiguracionRepository(), ids, clock, new FakeWebhookPublisher(), silentLogger);
    const cambiar = new ActualizarEstadoTicketService(repo, new InMemoryConfiguracionRepository(), ids, clock, email, webhooks, silentLogger);

    const t = await crear.ejecutar({
      actor: actor(),
      asunto: 'Cliente con problema',
      descripcion: 'descripción larga',
      tipo: 'General',
      prioridad: 'Media',
      contactoCorreo: 'cliente@empresa.com',
      contactoNombre: 'Cliente',
    });
    await cambiar.ejecutar({ actor: actor(), ticketId: t.id, nuevoEstado: 'Cerrado' });

    expect(email.enviados).toHaveLength(1);
    expect(email.ultimo?.asunto).toContain('cerrado');
    expect(webhooks.eventos).toContain('ticket.cerrado');
  });

  it('un agente no puede cambiar el estado de un ticket que no es suyo', async () => {
    seq = 0;
    const store = new InMemoryTicketStore();
    const clock = new FixedClock(new Date());
    const repo = new InMemoryTicketRepository(store);
    const crear = new CrearTicketService(repo, new InMemoryContadorRepository(), new InMemoryConfiguracionRepository(), ids, clock, new FakeWebhookPublisher(), silentLogger);
    const cambiar = new ActualizarEstadoTicketService(repo, new InMemoryConfiguracionRepository(), ids, clock, new FakeEmailSender(), new FakeWebhookPublisher(), silentLogger);
    const t = await crear.ejecutar({ actor: actor(), asunto: 'Ajeno', descripcion: 'descripción', tipo: 'General', prioridad: 'Media' });

    const agenteOtro = actor({ uid: 'ag2', rol: 'agente', permisos: ['tickets:cambiar_estado'] });
    await expect(
      cambiar.ejecutar({ actor: agenteOtro, ticketId: t.id, nuevoEstado: 'En proceso' }),
    ).rejects.toThrow(/asignados a ti/);
  });
});
