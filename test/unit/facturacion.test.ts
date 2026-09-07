import { beforeEach, describe, expect, it } from 'vitest';
import { CrearTicketService } from '../../src/application/tickets/CrearTicketService.js';
import { MarcarFacturacionService } from '../../src/application/tickets/MarcarFacturacionService.js';
import {
  parseEstadoFacturacion,
  sanearEstadoFacturacion,
  esFacturacionCompletada,
} from '../../src/core/entities/value-objects/EstadoFacturacion.js';
import { ValidationError } from '../../src/core/errors/DomainError.js';
import type { SessionUser } from '../../src/application/shared/SessionUser.js';
import {
  InMemoryTicketStore,
  InMemoryTicketRepository,
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
  permisos: ['tickets:crear', 'tickets:editar'],
  ...over,
});

describe('EstadoFacturacion (value object)', () => {
  it('valida el catálogo fijo y rechaza lo demás', () => {
    expect(parseEstadoFacturacion('factura_mensual')).toBe('factura_mensual');
    expect(() => parseEstadoFacturacion('otro')).toThrow(ValidationError);
  });

  it('respalda al esquema viejo (facturado: boolean) cuando no viene estado', () => {
    expect(sanearEstadoFacturacion(undefined, true)).toBe('facturado');
    expect(sanearEstadoFacturacion(undefined, false)).toBe('no_facturado');
    expect(sanearEstadoFacturacion('consulta_sin_costo', false)).toBe('consulta_sin_costo');
  });

  it('solo facturado y factura_mensual cuentan como facturación completada', () => {
    expect(esFacturacionCompletada('facturado')).toBe(true);
    expect(esFacturacionCompletada('factura_mensual')).toBe(true);
    expect(esFacturacionCompletada('no_aplica')).toBe(false);
    expect(esFacturacionCompletada('consulta_sin_costo')).toBe(false);
  });
});

describe('alta y cambio de estado de facturación', () => {
  let store: InMemoryTicketStore;
  let clock: FixedClock;
  let webhooks: FakeWebhookPublisher;
  let repo: InMemoryTicketRepository;
  let crear: CrearTicketService;
  let facturar: MarcarFacturacionService;

  beforeEach(() => {
    seq = 0;
    store = new InMemoryTicketStore();
    clock = new FixedClock(new Date('2026-09-01T09:00:00Z'));
    webhooks = new FakeWebhookPublisher();
    repo = new InMemoryTicketRepository(store);
    crear = new CrearTicketService(
      repo,
      new InMemoryContadorRepository(),
      new InMemoryConfiguracionRepository(),
      ids,
      clock,
      webhooks,
      silentLogger,
    );
    facturar = new MarcarFacturacionService(repo, ids, clock, webhooks);
  });

  it('el alta captura el estado de facturación del catálogo', async () => {
    const t = await crear.ejecutar({
      actor: actor(),
      asunto: 'Sin costo',
      descripcion: 'consulta rápida sin cargo',
      tipo: 'General',
      prioridad: 'Media',
      estadoFacturacion: 'consulta_sin_costo',
    });
    expect(t.facturacion.estado).toBe('consulta_sin_costo');
  });

  it('cambiar a facturado dispara el webhook una sola vez', async () => {
    const t = await crear.ejecutar({
      actor: actor(),
      asunto: 'Consultoría',
      descripcion: 'trabajo en sitio facturable',
      tipo: 'General',
      prioridad: 'Media',
    });
    webhooks.publicados.length = 0;

    await facturar.ejecutar({ actor: actor(), ticketId: t.id, estado: 'facturado' });
    expect(webhooks.eventos).toEqual(['ticket.facturado']);

    // Reasignar a otro estado completado no vuelve a disparar.
    await facturar.ejecutar({ actor: actor(), ticketId: t.id, estado: 'factura_mensual' });
    expect(webhooks.eventos).toEqual(['ticket.facturado']);

    const guardado = await repo.findById(t.id);
    expect(guardado?.facturacion.estado).toBe('factura_mensual');
    expect((await repo.listarEventos(t.id)).filter((e) => e.tipo === 'facturacion')).toHaveLength(2);
  });
});
