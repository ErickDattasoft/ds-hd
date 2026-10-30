import { describe, expect, it } from 'vitest';
import {
  datetimeLocalMexico,
  instanteDeDatetimeLocal,
  instanteMexico,
  relojMexico,
} from '../../src/core/entities/value-objects/horaMexico.js';
import { fechaHoraAgenda } from '../../src/core/entities/value-objects/AgendaTicket.js';

describe('hora de México', () => {
  it('lo capturado como 10:00 es 16:00 UTC, sin importar la zona del proceso', () => {
    expect(instanteMexico('2026-11-05', '10:00').toISOString()).toBe('2026-11-05T16:00:00.000Z');
    expect(instanteDeDatetimeLocal('2026-11-05T10:00').toISOString()).toBe('2026-11-05T16:00:00.000Z');
    expect(fechaHoraAgenda({ fecha: '2026-11-05', hora: '22:30', recordatorioWhatsapp: false }).toISOString()).toBe(
      '2026-11-06T04:30:00.000Z',
    );
  });

  it('el formulario se prellena con la misma hora que se capturó', () => {
    expect(datetimeLocalMexico(instanteDeDatetimeLocal('2026-11-05T22:30'))).toBe('2026-11-05T22:30');
  });

  it('el reloj para el calendario da día y hora de México', () => {
    const r = relojMexico(new Date('2026-11-06T04:30:00Z'));
    expect([r.getFullYear(), r.getMonth() + 1, r.getDate(), r.getHours(), r.getMinutes()]).toEqual([2026, 11, 5, 22, 30]);
  });
});
