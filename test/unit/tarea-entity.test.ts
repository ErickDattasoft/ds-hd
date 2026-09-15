import { describe, expect, it } from 'vitest';
import { Tarea } from '../../src/core/entities/Tarea.js';

const iso = (offsetDias: number): string => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offsetDias);
  return d.toISOString().slice(0, 10);
};

describe('Tarea.urgencia', () => {
  it('null sin fecha o si ya está completada', () => {
    const sinFecha = new Tarea({ id: 't1', titulo: 'Sin fecha', asignadoAUid: 'u1' });
    expect(sinFecha.urgencia).toBeNull();

    const completada = new Tarea({ id: 't2', titulo: 'Completada', asignadoAUid: 'u1', vence: iso(-3), completada: true });
    expect(completada.urgencia).toBeNull();
    expect(completada.vencida).toBe(false);
  });

  it('vencida si la fecha ya pasó', () => {
    const t = new Tarea({ id: 't3', titulo: 'Vencida', asignadoAUid: 'u1', vence: iso(-1) });
    expect(t.urgencia).toBe('vencida');
    expect(t.vencida).toBe(true);
  });

  it('hoy si vence el día de hoy', () => {
    const t = new Tarea({ id: 't4', titulo: 'Hoy', asignadoAUid: 'u1', vence: iso(0) });
    expect(t.urgencia).toBe('hoy');
    expect(t.vencida).toBe(false);
  });

  it('proxima si vence en el futuro', () => {
    const t = new Tarea({ id: 't5', titulo: 'Próxima', asignadoAUid: 'u1', vence: iso(5) });
    expect(t.urgencia).toBe('proxima');
    expect(t.vencida).toBe(false);
  });
});
