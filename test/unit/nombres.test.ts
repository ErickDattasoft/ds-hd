import { describe, expect, it } from 'vitest';
import { nombreEmpresa, nombrePersona } from '../../src/core/entities/value-objects/nombres.js';

describe('formato de nombres', () => {
  it('empresa siempre en mayúsculas', () => {
    expect(nombreEmpresa('  david   leal ')).toBe('DAVID LEAL');
    expect(nombreEmpresa('Construcciones Peña')).toBe('CONSTRUCCIONES PEÑA');
  });
  it('contacto como nombre propio', () => {
    expect(nombrePersona('DAVID LEAL')).toBe('David Leal');
    expect(nombrePersona('juno mendoza DE LA cruz')).toBe('Juno Mendoza de la Cruz');
    expect(nombrePersona('CP. PAULINA ARCEO')).toBe('C.P. Paulina Arceo');
    expect(nombrePersona('C.P. paulina arceo')).toBe('C.P. Paulina Arceo');
    expect(nombrePersona('ana lópez-pérez')).toBe('Ana López-Pérez');
    expect(nombrePersona('maría josé ñúñez')).toBe('María José Ñúñez');
    expect(nombrePersona('De la Rosa')).toBe('De la Rosa');
    expect(nombrePersona('Soporte@Empresa.mx')).toBe('Soporte@Empresa.mx');
  });
});
