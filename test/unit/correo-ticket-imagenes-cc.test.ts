import { describe, expect, it } from 'vitest';
import { destinatariosTicket, resumenTicketHtml } from '../../src/application/tickets/notificacionTicket.js';
import { Ticket } from '../../src/core/entities/Ticket.js';

describe('correo del ticket', () => {
  it('lleva el CC y el CCO capturados en el ticket, sin repetir a nadie', () => {
    const d = destinatariosTicket(
      { contactoCorreo: 'ana@acme.mx', contactoNombre: 'Ana', cc: ['beto@acme.mx', 'ANA@acme.mx'], cco: ['oculto@x.mx', 'beto@acme.mx'] },
      ['soporte@dattasoft.mx'],
      null,
    );
    expect(d.para).toEqual([{ email: 'ana@acme.mx', nombre: 'Ana' }]);
    expect(d.cc.map((x) => x.email)).toEqual(['soporte@dattasoft.mx', 'beto@acme.mx']);
    expect(d.cco).toEqual([{ email: 'oculto@x.mx' }]);
  });

  it('enlaza las imágenes pegadas a /adjunto/<id> y agrega enlaces por si se bloquean', () => {
    const t = new Ticket({
      id: 'tic-1059', numero: 1059, asunto: 'Estatus', tipo: 'General', estado: 'Abierto', prioridad: 'Media', canal: 'interno',
      descripcion: '<p>Adjunto pantallas.</p><p><img data-adj-id="rJyuf4QGqbHXQtaA0Fku"><img data-adj-id="ad93HUZGcAdfqLn6xmQD"></p>',
    });
    const html = resumenTicketHtml(t, [], { baseUrl: 'https://ds-hd.example.dev/' });
    expect(html).toContain('<img src="https://ds-hd.example.dev/adjunto/rJyuf4QGqbHXQtaA0Fku"');
    expect(html).toContain('<a href="https://ds-hd.example.dev/adjunto/ad93HUZGcAdfqLn6xmQD">Imagen 2</a>');
    expect(html).not.toContain('data-adj-id');
  });
});
