import { beforeEach, describe, expect, it } from 'vitest';
import { Ticket } from '../../src/core/entities/Ticket.js';
import { ESTADOS_POR_DEFECTO } from '../../src/core/entities/value-objects/EstadoTicket.js';
import { AjustarTiempoService } from '../../src/application/tickets/AjustarTiempoService.js';
import { ValidationError } from '../../src/core/errors/DomainError.js';
import type { SessionUser } from '../../src/application/shared/SessionUser.js';
import { InMemoryTicketStore, InMemoryTicketRepository } from '../fakes/tickets.js';
import { FixedClock } from '../fakes/support.js';

const H = 3_600_000;
let seq = 0;
const ids = { newId: () => `id-${++seq}`, newToken: () => `tok-${++seq}` };

const actor = (permisos: string[] = ['tickets:editar']): SessionUser => ({
  uid: 'u1',
  nombre: 'Tecnico',
  email: 't@d.com',
  roles: ['agente'],
  rol: 'agente',
  esTecnico: true,
  empresaId: null,
  activo: true,
  esStaff: true,
  esCliente: false,
  permisos,
});

/** Ticket que pasó: Abierto (2h espera) → En proceso (3h trabajo) → Pendiente (1h espera) → En proceso (1h). */
function ticketConHistorial(clock: FixedClock): Ticket {
  const t = Ticket.crear({
    id: 't1',
    numero: 1,
    asunto: 'Con tramos',
    descripcion: 'descripción larga suficiente',
    tipo: 'General',
    prioridad: 'Media',
    estadoInicial: 'Abierto',
    canal: 'interno',
    ahora: clock.now(),
  });
  clock.avanzarMs(2 * H);
  t.cambiarEstado('En proceso', ESTADOS_POR_DEFECTO, clock.now());
  clock.avanzarMs(3 * H);
  t.cambiarEstado('Pendiente', ESTADOS_POR_DEFECTO, clock.now());
  clock.avanzarMs(1 * H);
  t.cambiarEstado('En proceso', ESTADOS_POR_DEFECTO, clock.now());
  clock.avanzarMs(1 * H);
  return t;
}

describe('línea de tiempo del ticket', () => {
  let clock: FixedClock;

  beforeEach(() => {
    seq = 0;
    clock = new FixedClock(new Date('2026-09-01T08:00:00Z'));
  });

  it('un tramo por cambio de estado, con cuenta = true solo en trabajo activo', () => {
    const t = ticketConHistorial(clock);
    const tl = t.lineaDeTiempo(clock.now());
    expect(tl.map((x) => [x.estado, x.cuenta, Math.round(x.ms / H)])).toEqual([
      ['Abierto', false, 2],
      ['En proceso', true, 3],
      ['Pendiente', false, 1],
      ['En proceso', true, 1],
    ]);
  });

  it('el tiempo calculado suma solo los tramos que cuentan', () => {
    const t = ticketConHistorial(clock);
    expect(t.tiempoTrabajadoCalculadoMs(clock.now())).toBe(4 * H);
    expect(t.tiempoTrabajadoEfectivoMs(clock.now())).toBe(4 * H);
  });

  it('el ajuste manual gana sobre el calculado y se puede quitar', () => {
    const t = ticketConHistorial(clock);
    t.ajustarTiempoManual(90 * 60_000, clock.now());
    expect(t.tiempoTrabajadoEfectivoMs(clock.now())).toBe(90 * 60_000);
    expect(t.tiempoTrabajadoCalculadoMs(clock.now())).toBe(4 * H);
    t.ajustarTiempoManual(null, clock.now());
    expect(t.tiempoTrabajadoEfectivoMs(clock.now())).toBe(4 * H);
  });

  it('el último tramo se congela al resolver (no crece con el reloj)', () => {
    const t = ticketConHistorial(clock);
    t.cambiarEstado('Resuelto', ESTADOS_POR_DEFECTO, clock.now());
    const antes = t.tiempoTrabajadoCalculadoMs(clock.now());
    clock.avanzarMs(10 * H);
    expect(t.tiempoTrabajadoCalculadoMs(clock.now())).toBe(antes);
  });
});

describe('AjustarTiempoService', () => {
  let clock: FixedClock;
  let store: InMemoryTicketStore;
  let repo: InMemoryTicketRepository;
  let service: AjustarTiempoService;

  beforeEach(() => {
    seq = 0;
    clock = new FixedClock(new Date('2026-09-01T08:00:00Z'));
    store = new InMemoryTicketStore();
    repo = new InMemoryTicketRepository(store);
    service = new AjustarTiempoService(repo, ids, clock);
  });

  it('fija el ajuste manual y registra un evento', async () => {
    const t = ticketConHistorial(clock);
    await repo.save(t);
    await service.ejecutar({ actor: actor(), ticketId: t.id, quitar: false, horas: 2, minutos: 30 });
    const guardado = await repo.findById(t.id);
    expect(guardado?.tiempoTrabajadoManualMs).toBe(150 * 60_000);
    expect((await repo.listarEventos(t.id)).some((e) => e.resumen.includes('ajustado a mano'))).toBe(true);
  });

  it('rechaza un ajuste de cero y respeta el permiso', async () => {
    const t = ticketConHistorial(clock);
    await repo.save(t);
    await expect(
      service.ejecutar({ actor: actor(), ticketId: t.id, quitar: false, horas: 0, minutos: 0 }),
    ).rejects.toBeInstanceOf(ValidationError);
    await expect(
      service.ejecutar({ actor: actor(['tickets:leer']), ticketId: t.id, quitar: false, horas: 1, minutos: 0 }),
    ).rejects.toThrow();
  });

  it('quitar el ajuste vuelve al automático', async () => {
    const t = ticketConHistorial(clock);
    t.ajustarTiempoManual(60_000, clock.now());
    await repo.save(t);
    await service.ejecutar({ actor: actor(), ticketId: t.id, quitar: true, horas: 0, minutos: 0 });
    expect((await repo.findById(t.id))?.tiempoTrabajadoManualMs).toBeNull();
  });
});
