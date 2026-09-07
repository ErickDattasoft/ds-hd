import { describe, expect, it } from 'vitest';
import { Empresa } from '../../src/core/entities/Empresa.js';

const HOY = new Date('2026-09-03T10:00:00');

const empresaCon = (sistemasContratados: string[], vigencias: Record<string, string>) =>
  new Empresa({ id: 'e1', nombre: 'ACME', sistemasContratados, vigencias });

describe('Empresa — vigencias de licencia', () => {
  it('sanea vigencias: descarta formato inválido y sistemas no contratados', () => {
    const e = empresaCon(['Contabilidad', 'Nóminas'], {
      Contabilidad: '2026-12-01',
      'Nóminas': '01/12/2026', // formato inválido
      Bancos: '2026-12-01', // sistema no contratado
    });
    expect(e.vigencias).toEqual({ Contabilidad: '2026-12-01' });
  });

  it('estadoVigencia clasifica sin_dato / vigente / por_vencer / vencida', () => {
    const e = empresaCon(['A', 'B', 'C', 'D'], {
      B: '2027-06-01', // > 30 días
      C: '2026-09-20', // dentro de 30 días
      D: '2026-08-01', // ya pasó
    });
    expect(e.estadoVigencia('A', HOY)).toBe('sin_dato');
    expect(e.estadoVigencia('B', HOY)).toBe('vigente');
    expect(e.estadoVigencia('C', HOY)).toBe('por_vencer');
    expect(e.estadoVigencia('D', HOY)).toBe('vencida');
  });

  it('el límite de "por vencer" son 30 días exactos', () => {
    const e = empresaCon(['X', 'Y'], { X: '2026-10-03', Y: '2026-10-04' });
    expect(e.estadoVigencia('X', HOY)).toBe('por_vencer'); // exactamente 30 días
    expect(e.estadoVigencia('Y', HOY)).toBe('vigente'); // 31 días
  });

  it('licenciasEnRiesgo devuelve vencidas y por vencer, ordenadas por urgencia', () => {
    const e = empresaCon(['A', 'B', 'C', 'D'], {
      A: '2026-09-20', // por vencer (+17)
      B: '2026-08-01', // vencida (-33)
      C: '2027-01-01', // vigente → excluida
      D: '2026-09-01', // vencida (-2)
    });
    expect(e.licenciasEnRiesgo(HOY).map((l) => l.sistema)).toEqual(['B', 'D', 'A']);
    expect(e.licenciasEnRiesgo(HOY).find((l) => l.sistema === 'D')?.estado).toBe('vencida');
  });

  it('al dejar de contratar un sistema se descarta su vigencia', () => {
    const e = empresaCon(['Contabilidad', 'Bancos'], { Contabilidad: '2026-12-01', Bancos: '2026-12-01' });
    e.sistemasContratados = ['Contabilidad'];
    e.vigencias = Empresa.sanearVigencias(e.vigencias, e.sistemasContratados);
    expect(e.vigencias).toEqual({ Contabilidad: '2026-12-01' });
  });

  it('marcarFavorita alterna el flag y toca updatedAt', () => {
    const e = new Empresa({ id: 'e1', nombre: 'ACME' });
    expect(e.favorita).toBe(false);
    const t1 = new Date('2026-09-07T10:00:00Z');
    e.marcarFavorita(true, t1);
    expect(e.favorita).toBe(true);
    expect(e.updatedAt).toEqual(t1);
    e.marcarFavorita(false, new Date('2026-09-07T11:00:00Z'));
    expect(e.favorita).toBe(false);
  });
});
