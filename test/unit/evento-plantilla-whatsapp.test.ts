import { describe, expect, it } from 'vitest';
import { Evento, resolverPlantillaEvento } from '../../src/core/entities/Evento.js';

const posada = (extra: Partial<ConstructorParameters<typeof Evento>[0]> = {}) =>
  new Evento({
    id: 'ev1',
    titulo: 'Posada DATTASOFT',
    tipo: 'presencial',
    fechaHora: new Date('2026-12-04T21:00:00Z'),
    estado: 'publicado',
    lugarNombre: 'Salón Los Arcos',
    ...extra,
  });

describe('correo de confirmación del evento — WhatsApp de contacto', () => {
  it('sin WhatsApp de contacto usa el de «📤 Se envía desde»', () => {
    const texto = resolverPlantillaEvento(posada({ envioWhatsapp: '999 123 4567' }), { nombre: 'Luis' });
    expect(texto).toContain('escríbenos por WhatsApp: 999 123 4567');
  });

  it('el WhatsApp de contacto del evento gana sobre el de envío', () => {
    const texto = resolverPlantillaEvento(posada({ contactoWhatsapp: '999 000 1111', envioWhatsapp: '999 123 4567' }), { nombre: 'Luis' });
    expect(texto).toContain('WhatsApp: 999 000 1111');
  });

  it('sin ningún WhatsApp quita el renglón entero (y la firma vacía), sin dejar huecos', () => {
    const texto = resolverPlantillaEvento(posada(), { nombre: 'Luis' });
    expect(texto).not.toContain('WhatsApp');
    expect(texto).not.toMatch(/—\s*$/);
    expect(texto).not.toMatch(/\n{3,}/);
    expect(texto).toContain('📍 Salón Los Arcos');
  });
});
