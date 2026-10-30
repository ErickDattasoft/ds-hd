import { describe, expect, it } from 'vitest';
import { CrearTicketService } from '../../src/application/tickets/CrearTicketService.js';
import { alcanceTickets, ticketVisiblePara } from '../../src/application/tickets/alcance.js';
import { distribuidoresDe } from '../../src/core/entities/ConfiguracionTickets.js';
import { normalizarDistribuidor, Ticket } from '../../src/core/entities/Ticket.js';
import type { SessionUser } from '../../src/application/shared/SessionUser.js';
import {
  InMemoryConfiguracionRepository,
  InMemoryContadorRepository,
  InMemoryTicketQueries,
  InMemoryTicketRepository,
  InMemoryTicketStore,
  FakeWebhookPublisher,
} from '../fakes/tickets.js';
import { FixedClock, silentLogger } from '../fakes/support.js';
import { InMemoryAdjuntoTicketRepository } from '../fakes/InMemoryAdjuntoTicketRepository.js';

let seq = 0;
const ids = { newId: () => `id-${++seq}`, newToken: () => `tok-${++seq}` };

const actor = (over: Partial<SessionUser> = {}): SessionUser => ({
  uid: 'u1',
  nombre: 'Admin',
  email: 'a@d.com',
  roles: ['admin'],
  rol: 'admin',
  esTecnico: true,
  empresaId: null,
  activo: true,
  esStaff: true,
  esCliente: false,
  permisos: ['tickets:crear', 'tickets:editar', 'tickets:leer_todos'],
  ...over,
});

const ticket = (id: string, distribuidor?: string): Ticket =>
  new Ticket({
    id,
    numero: Number(id.replace(/\D/g, '')) || 1,
    asunto: 'Asunto de prueba',
    descripcion: 'Descripción de prueba',
    tipo: 'General',
    estado: 'Abierto',
    prioridad: 'Media',
    canal: 'interno',
    ...(distribuidor ? { distribuidor } : {}),
  });

describe('distribuidor', () => {
  it('sin distribuidor (tickets de antes, respaldo del viejo) es DATTASOFT; se normaliza a mayúsculas', () => {
    expect(ticket('t1').distribuidor).toBe('DATTASOFT');
    expect(normalizarDistribuidor('  xelcron ')).toBe('XELCRON');
  });

  it('el catálogo siempre lleva DATTASOFT primero y sin repetidos', () => {
    expect(distribuidoresDe({ distribuidores: ['tony', 'ALFONSO', 'Tony'] })).toEqual(['DATTASOFT', 'TONY', 'ALFONSO']);
    expect(distribuidoresDe({})).toEqual(['DATTASOFT']);
  });

  it('quien es de otro distribuidor solo ve lo suyo, aunque su rol vea todo', async () => {
    const store = new InMemoryTicketStore();
    const repo = new InMemoryTicketRepository(store);
    await repo.save(ticket('t1'));
    await repo.save(ticket('t2', 'XELCRON'));
    const queries = new InMemoryTicketQueries(store);
    const xelcron = actor({ distribuidor: 'XELCRON' });

    expect((await queries.listar({ ...alcanceTickets(xelcron) })).map((t) => t.id)).toEqual(['t2']);
    expect((await queries.listar({ ...alcanceTickets(actor()) })).length).toBe(2);
    expect(ticketVisiblePara(ticket('t1'), xelcron)).toBe(false);
    expect(ticketVisiblePara(ticket('t2', 'XELCRON'), xelcron)).toBe(true);
    // El filtro de la lista por DATTASOFT incluye los que no traen el campo.
    expect((await queries.listar({ distribuidor: 'DATTASOFT' })).map((t) => t.id)).toEqual(['t1']);
  });

  it('al crear se usa el elegido; quien es de otro distribuidor siempre crea con el suyo', async () => {
    const crear = new CrearTicketService(
      new InMemoryTicketRepository(new InMemoryTicketStore()),
      new InMemoryContadorRepository(),
      new InMemoryConfiguracionRepository(),
      new InMemoryAdjuntoTicketRepository(),
      ids,
      new FixedClock(new Date('2026-10-30T12:00:00Z')),
      new FakeWebhookPublisher(),
      silentLogger,
    );
    const base = { asunto: 'No timbra', descripcion: 'Falla al timbrar la factura', tipo: 'General', prioridad: 'Media' as const };
    expect((await crear.ejecutar({ ...base, actor: actor(), distribuidor: 'tony' })).distribuidor).toBe('TONY');
    expect((await crear.ejecutar({ ...base, actor: actor() })).distribuidor).toBe('DATTASOFT');
    expect((await crear.ejecutar({ ...base, actor: actor({ distribuidor: 'ALFONSO' }), distribuidor: 'TONY' })).distribuidor).toBe('ALFONSO');
  });
});
