import { describe, expect, it } from 'vitest';
import { CalculadoraCompac, CONFIG_CALCULADORA_POR_DEFECTO } from '../../src/core/entities/CalculadoraCompac.js';
import { ValidationError } from '../../src/core/errors/DomainError.js';

const cfg = CONFIG_CALCULADORA_POR_DEFECTO;

describe('CalculadoraCompac', () => {
  it('cobra el sistema más caro como principal y el resto como adicional', () => {
    const r = CalculadoraCompac.calcular(
      [{ tipo: 'Servidor', sistemas: ['CONTABILIDAD', 'BANCOS'] }],
      cfg,
    );
    // Contabilidad (9800 primero) + Bancos (3600 adicional) = 13400
    expect(r.subtotal).toBe(13400);
    expect(r.iva).toBe(2144);
    expect(r.total).toBe(15544);
    expect(r.conceptos[0]?.descripcion).toContain('principal');
    expect(r.conceptos[1]?.descripcion).toContain('adicional');
  });

  it('SQL se cobra aparte por equipo según el tipo (servidor sí, terminal no)', () => {
    const servidor = CalculadoraCompac.calcular([{ tipo: 'Servidor', sistemas: ['CONTABILIDAD', 'SQL'] }], cfg);
    expect(servidor.subtotal).toBe(9800 + 6900);

    const terminal = CalculadoraCompac.calcular([{ tipo: 'Terminal', sistemas: ['CONTABILIDAD', 'SQL'] }], cfg);
    expect(terminal.subtotal).toBe(9800); // Contabilidad (único → precio principal), SQL terminal = 0
  });

  it('suma varios equipos', () => {
    const r = CalculadoraCompac.calcular(
      [
        { tipo: 'Servidor', sistemas: ['NOMINAS'] },
        { tipo: 'Terminal', sistemas: ['NOMINAS'] },
      ],
      cfg,
    );
    expect(r.subtotal).toBe(12500 + 12500);
  });

  it('rechaza sin equipos', () => {
    expect(() => CalculadoraCompac.calcular([], cfg)).toThrow(ValidationError);
  });
});
