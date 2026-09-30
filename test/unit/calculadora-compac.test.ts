import { describe, expect, it } from 'vitest';
import {
  CalculadoraCompac,
  CONFIG_CALCULADORA_POR_DEFECTO,
  sanearConfigCalculadora,
} from '../../src/core/entities/CalculadoraCompac.js';
import { ValidationError } from '../../src/core/errors/DomainError.js';

const cfg = CONFIG_CALCULADORA_POR_DEFECTO;

describe('CalculadoraCompac (paridad con el CRM viejo)', () => {
  it('cobra por tipo de equipo: 1er sistema + adicional por cada sistema extra, por la cantidad', () => {
    const r = CalculadoraCompac.calcular(
      [{ tipo: 'Terminal', cantidad: 3, sistemas: ['Contabilidad', 'Bancos', 'Nóminas'], incluyeSql: false }],
      cfg,
    );
    // Terminal: 200 + 2 × 100 = 400 por equipo × 3
    expect(r.grupos[0]?.precioUnitario).toBe(400);
    expect(r.total).toBe(1200);
    expect(r.conceptos).toEqual([
      expect.objectContaining({ descripcion: 'Terminal — Contabilidad, Bancos, Nóminas', cantidad: 3, precioUnitario: 400 }),
    ]);
  });

  it('SQL va en renglón aparte y solo para Servidor', () => {
    const r = CalculadoraCompac.calcular(
      [
        { tipo: 'Servidor', cantidad: 1, sistemas: ['Componentes', 'Contabilidad'], incluyeSql: true },
        { tipo: 'Terminal', cantidad: 2, sistemas: ['Contabilidad'], incluyeSql: true },
      ],
      cfg,
    );
    expect(r.conceptos.map((c) => [c.descripcion, c.cantidad, c.precioUnitario])).toEqual([
      ['Servidor — Componentes, Contabilidad', 1, 1200],
      ['Servidor — SQL', 1, 800],
      ['Terminal — Contabilidad', 2, 200],
    ]);
    expect(r.total).toBe(1200 + 800 + 400);
    expect([r.servidores, r.terminales, r.conComponentes]).toEqual([1, 2, 1]);
  });

  it('un grupo de solo SQL manda únicamente el renglón de SQL', () => {
    const r = CalculadoraCompac.calcular([{ tipo: 'Servidor', cantidad: 1, sistemas: [], incluyeSql: true }], cfg);
    expect(r.conceptos.map((c) => c.descripcion)).toEqual(['Servidor — SQL']);
  });

  it('rechaza sin grupos válidos o con un tipo que no está en el catálogo', () => {
    expect(() => CalculadoraCompac.calcular([], cfg)).toThrow(ValidationError);
    expect(() =>
      CalculadoraCompac.calcular([{ tipo: 'Terminal', cantidad: 0, sistemas: ['Bancos'], incluyeSql: false }], cfg),
    ).toThrow(ValidationError);
    expect(() =>
      CalculadoraCompac.calcular([{ tipo: 'Laptop', cantidad: 1, sistemas: ['Bancos'], incluyeSql: false }], cfg),
    ).toThrow(ValidationError);
  });

  it('un documento con el modelo anterior (precio por sistema) cae a los precios del viejo', () => {
    const c = sanearConfigCalculadora({ sistemas: [{ clave: 'X', precioPrimero: 9800 }], sql: {}, ivaTasa: 0.16 });
    expect(c).toEqual(CONFIG_CALCULADORA_POR_DEFECTO);
    // y acepta el formato del viejo ({ nombre }) para los sistemas
    expect(sanearConfigCalculadora({ catalogoSistemas: [{ nombre: 'Xelcron' }] }).catalogoSistemas).toEqual(['Xelcron']);
  });
});
