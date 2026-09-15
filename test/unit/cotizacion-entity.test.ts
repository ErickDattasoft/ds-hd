import { describe, expect, it } from 'vitest';
import { Cotizacion, importeBruto } from '../../src/core/entities/Cotizacion.js';

describe('Cotizacion — descuento por concepto', () => {
  it('calcula el importe con el descuento aplicado', () => {
    const cot = new Cotizacion({
      id: 'c1',
      folio: 'COT-2026-0001',
      empresaId: 'e1',
      fecha: new Date('2026-01-01'),
      conceptos: [
        { descripcion: 'Instalación', cantidad: 2, precioUnitario: 1000, descuento: 10, importe: 0 },
        { descripcion: 'Soporte', cantidad: 1, precioUnitario: 500, descuento: 0, importe: 0 },
      ],
    });
    expect(cot.conceptos[0]!.importe).toBe(1800); // 2*1000 * 0.9
    expect(cot.conceptos[1]!.importe).toBe(500);
    expect(cot.subtotal).toBe(2300);
    expect(cot.iva).toBe(368); // 2300 * 0.16
    expect(cot.total).toBe(2668);
  });

  it('sin descuento (u omitido), el importe es igual al bruto', () => {
    const cot = new Cotizacion({
      id: 'c2',
      folio: 'COT-2026-0002',
      empresaId: 'e1',
      fecha: new Date('2026-01-01'),
      conceptos: [{ descripcion: 'Licencia', cantidad: 3, precioUnitario: 200, descuento: undefined as unknown as number, importe: 0 }],
    });
    expect(cot.conceptos[0]!.descuento).toBe(0);
    expect(cot.conceptos[0]!.importe).toBe(600);
  });

  it('el descuento se acota a [0,100] aunque venga fuera de rango', () => {
    const cot = new Cotizacion({
      id: 'c3',
      folio: 'COT-2026-0003',
      empresaId: 'e1',
      fecha: new Date('2026-01-01'),
      conceptos: [{ descripcion: 'X', cantidad: 1, precioUnitario: 100, descuento: 150, importe: 0 }],
    });
    expect(cot.conceptos[0]!.descuento).toBe(100);
    expect(cot.conceptos[0]!.importe).toBe(0);
  });

  it('importeBruto ignora el descuento', () => {
    expect(importeBruto({ cantidad: 4, precioUnitario: 25 })).toBe(100);
  });
});
