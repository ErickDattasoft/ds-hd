import { describe, expect, it } from 'vitest';
import { Ticket } from '../../src/core/entities/Ticket.js';
import { ESTADOS_POR_DEFECTO } from '../../src/core/entities/value-objects/EstadoTicket.js';
import { ValidationError } from '../../src/core/errors/DomainError.js';

const ESTADOS = [...ESTADOS_POR_DEFECTO];
const base = (ahora: Date) =>
  Ticket.crear({
    id: 't1',
    numero: 1,
    asunto: 'No abre Contabilidad',
    descripcion: 'Marca error al iniciar sesión',
    tipo: 'Soporte Técnico',
    prioridad: 'Alta',
    estadoInicial: 'Abierto',
    canal: 'interno',
    ahora,
  });

const H = 3_600_000;

describe('Ticket.crear', () => {
  it('rechaza asunto o descripción muy cortos', () => {
    expect(() =>
      Ticket.crear({
        id: 't',
        numero: 1,
        asunto: 'x',
        descripcion: 'ok pero',
        tipo: 'T',
        prioridad: 'Media',
        estadoInicial: 'Abierto',
        canal: 'interno',
        ahora: new Date(),
      }),
    ).toThrow(ValidationError);
  });

  it('fija el SLA por prioridad (Alta = 8h)', () => {
    const t = base(new Date('2026-09-01T09:00:00Z'));
    expect(t.sla.horasResolucion).toBe(8);
    expect(t.slaObjetivoMs()).toBe(8 * H);
  });
});

describe('transiciones de estado', () => {
  it('registra historial y marca resueltoEn/cerradoEn', () => {
    const t0 = new Date('2026-09-01T09:00:00Z');
    const t = base(t0);
    t.cambiarEstado('En proceso', ESTADOS, new Date(t0.getTime() + H));
    t.cambiarEstado('Resuelto', ESTADOS, new Date(t0.getTime() + 3 * H));
    expect(t.resueltoEn).toEqual(new Date(t0.getTime() + 3 * H));
    expect(t.historialEstados.map((h) => h.estado)).toEqual(['Abierto', 'En proceso', 'Resuelto']);
  });

  it('rechaza estado fuera del catálogo y transición al mismo estado', () => {
    const t = base(new Date());
    expect(() => t.cambiarEstado('Inventado', ESTADOS, new Date())).toThrow(ValidationError);
    expect(() => t.cambiarEstado('Abierto', ESTADOS, new Date())).toThrow(/ya está en estado/);
  });

  it('un ticket cerrado solo se puede reabrir a un estado activo', () => {
    const now = new Date('2026-09-01T09:00:00Z');
    const t = base(now);
    t.cambiarEstado('Cerrado', ESTADOS, now);
    expect(() => t.cambiarEstado('Resuelto', ESTADOS, now)).toThrow(/reabrirse/);
    t.cambiarEstado('En proceso', ESTADOS, now); // OK
    expect(t.cerradoEn).toBeNull();
  });
});

describe('tiempo trabajado', () => {
  it('solo acumula tiempo en estados de trabajo (no en abierto/pendiente)', () => {
    const t0 = new Date('2026-09-01T09:00:00Z');
    const t = base(t0);
    // 2h en "Abierto" → no cuenta
    t.cambiarEstado('En proceso', ESTADOS, new Date(t0.getTime() + 2 * H));
    // 3h en "En proceso" → cuenta
    t.cambiarEstado('Pendiente', ESTADOS, new Date(t0.getTime() + 5 * H));
    // 4h en "Pendiente" → no cuenta
    t.cambiarEstado('Resuelto', ESTADOS, new Date(t0.getTime() + 9 * H));
    expect(t.tiempoTrabajadoMs).toBe(3 * H);
  });
});

describe('SLA con pausa', () => {
  it('el estado "Pendiente" pausa el reloj de SLA', () => {
    const t0 = new Date('2026-09-01T09:00:00Z'); // SLA Alta = 8h
    const t = base(t0);
    t.cambiarEstado('Pendiente', ESTADOS, new Date(t0.getTime() + 2 * H)); // pausa
    t.cambiarEstado('En proceso', ESTADOS, new Date(t0.getTime() + 10 * H)); // 8h de pausa
    // Consumido: 2h (antes) + 0 durante pausa. A las +12h reales → 4h consumidas.
    const ahora = new Date(t0.getTime() + 12 * H);
    expect(Math.round(t.slaConsumidoMs(ahora) / H)).toBe(4);
    expect(t.estaVencido(ahora)).toBe(false);
  });

  it('marca vencido cuando se supera el objetivo sin pausas', () => {
    const t0 = new Date('2026-09-01T09:00:00Z');
    const t = base(t0);
    const ahora = new Date(t0.getTime() + 9 * H); // > 8h
    expect(t.estaVencido(ahora)).toBe(true);
    expect(t.slaRestanteMs(ahora)).toBeLessThan(0);
  });

  it('un ticket resuelto nunca está vencido', () => {
    const t0 = new Date('2026-09-01T09:00:00Z');
    const t = base(t0);
    t.cambiarEstado('Resuelto', ESTADOS, new Date(t0.getTime() + 20 * H));
    expect(t.estaVencido(new Date(t0.getTime() + 100 * H))).toBe(false);
  });
});

describe('asignación', () => {
  it('asigna y rechaza reasignar al mismo agente', () => {
    const t = base(new Date());
    t.asignar('a1', 'Ana', new Date());
    expect(t.agenteAsignadoNombre).toBe('Ana');
    expect(() => t.asignar('a1', 'Ana', new Date())).toThrow(/ya está asignado/);
  });
});
