import { describe, expect, it } from 'vitest';
import { nombresCoinciden, ticketEsDeAgente, ticketSinNadieAsignado } from '../../src/core/entities/Ticket.js';

describe('nombresCoinciden', () => {
  it('nombre corto y completo, sin importar mayúsculas ni acentos', () => {
    expect(nombresCoinciden('DIEGO', 'Diego Armando')).toBe(true);
    expect(nombresCoinciden('diego armando', 'Diego')).toBe(true);
    expect(nombresCoinciden(' Gelmí ', 'GELMI')).toBe(true);
  });
  it('por palabras, no por subcadena', () => {
    expect(nombresCoinciden('Ana', 'Mariana')).toBe(false);
    expect(nombresCoinciden('Diego', 'Erick')).toBe(false);
    expect(nombresCoinciden('', 'Erick')).toBe(false);
  });
});

describe('ticketEsDeAgente / ticketSinNadieAsignado', () => {
  const diego = { uid: 'u1', nombre: 'Diego Armando' };
  it('por uid, por "Agente" (migrado, sin uid) o por "Canalizado a"', () => {
    expect(ticketEsDeAgente({ agenteAsignadoUid: 'u1', agenteAsignadoNombre: null, canalizadoA: null }, diego)).toBe(true);
    expect(ticketEsDeAgente({ agenteAsignadoUid: null, agenteAsignadoNombre: 'DIEGO', canalizadoA: null }, diego)).toBe(true);
    expect(ticketEsDeAgente({ agenteAsignadoUid: null, agenteAsignadoNombre: 'ERICK', canalizadoA: 'diego' }, diego)).toBe(true);
    expect(ticketEsDeAgente({ agenteAsignadoUid: 'u2', agenteAsignadoNombre: 'Erick', canalizadoA: null }, diego)).toBe(false);
  });
  it('sin asignar = sin uid, sin nombre y sin canalizado', () => {
    expect(ticketSinNadieAsignado({ agenteAsignadoUid: null, agenteAsignadoNombre: null, canalizadoA: null })).toBe(true);
    expect(ticketSinNadieAsignado({ agenteAsignadoUid: null, agenteAsignadoNombre: 'DIEGO', canalizadoA: null })).toBe(false);
    expect(ticketSinNadieAsignado({ agenteAsignadoUid: null, agenteAsignadoNombre: null, canalizadoA: 'Soporte' })).toBe(false);
  });
});
