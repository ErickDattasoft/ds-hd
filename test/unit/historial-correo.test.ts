import { describe, expect, it } from 'vitest';
import { historialActividadHtml } from '../../src/application/tickets/historialCorreo.js';
import type { EventoTicket } from '../../src/core/entities/NotaTicket.js';

const ev = (over: Partial<EventoTicket>): EventoTicket => ({
  id: 'e' + Math.random(),
  tipo: 'cambio_estado',
  resumen: 'Estado: Abierto → Cerrado',
  actorUid: 'u1',
  actorNombre: 'Ana Soporte',
  at: new Date('2026-09-01T10:00:00Z'),
  ...over,
});

describe('historialActividadHtml', () => {
  it('devuelve "" si no hay eventos visibles', () => {
    expect(historialActividadHtml([], 'cliente')).toBe('');
    expect(historialActividadHtml([ev({ tipo: 'nota' })], 'cliente')).toBe('');
  });

  it('en modo cliente solo muestra creación, cambios de estado y reasignación', () => {
    const eventos = [
      ev({ tipo: 'creacion', resumen: 'Ticket #7 creado (portal)', at: new Date('2026-09-01T08:00:00Z') }),
      ev({ tipo: 'nota', resumen: 'Nota interna de Ana', at: new Date('2026-09-01T08:30:00Z') }),
      ev({ tipo: 'asignacion', resumen: 'Asignado a Beto', at: new Date('2026-09-01T09:00:00Z') }),
      ev({ tipo: 'cambio_estado', resumen: 'Estado: Abierto → Cerrado', at: new Date('2026-09-01T10:00:00Z') }),
      ev({ tipo: 'correo', resumen: 'Correo de "cerrado" enviado a x@y.com', at: new Date('2026-09-01T10:01:00Z') }),
    ];
    const html = historialActividadHtml(eventos, 'cliente');
    expect(html).toContain('Actividad del ticket');
    expect(html).toContain('creado');
    expect(html).toContain('Asignado a Beto');
    expect(html).toContain('Abierto → Cerrado');
    expect(html).not.toContain('Nota interna');
    expect(html).not.toContain('enviado a x@y.com');
  });

  it('en modo interno muestra todo, ordenado por fecha ascendente', () => {
    const eventos = [
      ev({ tipo: 'cambio_estado', resumen: 'EVENTO_NUEVO', actorNombre: null, at: new Date('2026-09-02T00:00:00Z') }),
      ev({ tipo: 'nota', resumen: 'EVENTO_VIEJO', actorNombre: null, at: new Date('2026-09-01T00:00:00Z') }),
    ];
    const html = historialActividadHtml(eventos, 'interno');
    expect(html).toContain('EVENTO_VIEJO');
    expect(html.indexOf('EVENTO_VIEJO')).toBeLessThan(html.indexOf('EVENTO_NUEVO'));
  });

  it('escapa el resumen y el nombre del actor', () => {
    const html = historialActividadHtml(
      [ev({ resumen: 'Estado: <b> → x', actorNombre: '<script>' })],
      'interno',
    );
    expect(html).toContain('&lt;b&gt;');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<b>');
    expect(html).not.toContain('<script>');
  });
});
