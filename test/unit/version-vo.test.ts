import { describe, expect, it } from 'vitest';
import { compararVersiones, estadoActualizacion } from '../../src/core/entities/value-objects/version.js';

describe('compararVersiones', () => {
  it('compara componente a componente', () => {
    expect(compararVersiones('16.2.0', '16.3.0')).toBe(-1);
    expect(compararVersiones('16.3.0', '16.3.0')).toBe(0);
    expect(compararVersiones('17.0.0', '16.9.9')).toBe(1);
  });

  it('tiene en cuenta el service pack', () => {
    expect(compararVersiones('16.3.1 SP1', '16.3.1 SP2')).toBe(-1);
    expect(compararVersiones('16.3.1 SP2', '16.3.1 SP2')).toBe(0);
  });

  it('sin versión oficial no hay con qué comparar', () => {
    expect(compararVersiones('16.3.1', '')).toBe(0);
  });

  it('instalada vacía o "no aplica" con oficial presente cuenta como menor', () => {
    expect(compararVersiones('', '16.3.1')).toBe(-1);
    expect(compararVersiones('NO APLICA', '16.3.1')).toBe(-1);
  });

  it('normaliza longitudes distintas', () => {
    expect(compararVersiones('16.3', '16.3.0')).toBe(0);
    expect(compararVersiones('16.3', '16.3.1')).toBe(-1);
  });
});

describe('estadoActualizacion', () => {
  it('clasifica sin_oficial / sin_dato / desactualizada / actualizada', () => {
    expect(estadoActualizacion('16.3.1', null)).toBe('sin_oficial');
    expect(estadoActualizacion(null, '16.3.1')).toBe('sin_dato');
    expect(estadoActualizacion('16.2.0', '16.3.1')).toBe('desactualizada');
    expect(estadoActualizacion('16.3.1', '16.3.1')).toBe('actualizada');
    expect(estadoActualizacion('16.4.0', '16.3.1')).toBe('actualizada');
  });
});
