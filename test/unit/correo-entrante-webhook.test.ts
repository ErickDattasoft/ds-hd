import { beforeEach, describe, expect, it } from 'vitest';
import { CorreoEntranteService } from '../../src/application/tickets/CorreoEntranteService.js';
import { textoDeHtmlCorreo, nombreDeRemitente, correoDeRemitente, numeroTicketDeAsunto } from '../../src/core/entities/ConfiguracionCorreoEntrante.js';
import { correoDeCloudMailin } from '../../src/infrastructure/email/CloudMailinCorreo.js';
import { Ticket } from '../../src/core/entities/Ticket.js';
import { Usuario } from '../../src/core/entities/Usuario.js';
import type { IBuzonEntrante } from '../../src/core/ports/services/IBuzonEntrante.js';
import {
  InMemoryConfiguracionRepository,
  InMemoryTicketPublicoRepository,
  InMemoryTicketRepository,
  InMemoryTicketStore,
} from '../fakes/tickets.js';
import { InMemoryAdjuntoTicketRepository } from '../fakes/InMemoryAdjuntoTicketRepository.js';
import { InMemoryUsuarioRepository } from '../fakes/InMemoryUsuarioRepository.js';
import { FakeEmailSender } from '../fakes/FakeEmailSender.js';
import { FixedClock, silentLogger } from '../fakes/support.js';

const PNG = Buffer.from('imagen-de-prueba').toString('base64');

/** Payload de CloudMailin (JSON Normalised) como el que llega del filtro de Zoho. */
const payload = (over: Record<string, unknown> = {}) => ({
  headers: { from: '"Luis Pérez" <Luis@Cliente.mx>', to: 'x@cloudmailin.net', subject: 'RE: [Ticket #7] No timbra', date: 'Fri, 02 Oct 2026 10:00:00 -0600' },
  envelope: { from: 'luis+uml_hash=cliente.mx@cloudmailin.net' },
  plain: 'Ya quedó, gracias.\n\nEl jue, 1 oct 2026 escribió:\n> texto viejo',
  html: '<div>Ya quedó, gracias.</div><blockquote>texto viejo</blockquote>',
  attachments: [
    { file_name: 'pantalla.png', content_type: 'image/png', content: PNG, disposition: 'attachment' },
    { file_name: 'logo.png', content_type: 'image/png', content: PNG, disposition: 'inline' },
    { file_name: 'factura.pdf', content_type: 'application/pdf', content: PNG, disposition: 'attachment' },
  ],
  ...over,
});

describe('helpers de correo entrante', () => {
  it('HTML sin el hilo citado (blockquote y gmail_quote)', () => {
    expect(textoDeHtmlCorreo('<p>Hola</p><blockquote>viejo</blockquote>')).toBe('Hola');
    expect(textoDeHtmlCorreo('<div>Nuevo</div><div class="gmail_quote">El mié escribió:<br>viejo</div>')).toBe('Nuevo');
  });
  it('nombre y correo del remitente', () => {
    expect(nombreDeRemitente('"Erick Casas" <erick@x.mx>')).toBe('Erick Casas');
    expect(nombreDeRemitente('erick@x.mx')).toBe('erick@x.mx');
    expect(correoDeRemitente('Erick <ERICK@X.MX>')).toBe('erick@x.mx');
  });
  it('el número exige la palabra "ticket" (un "Pedido #45" no es el ticket 45)', () => {
    expect(numeroTicketDeAsunto('Pedido #45')).toBeNull();
    expect(numeroTicketDeAsunto('RE: [Ticket #12] algo')).toBe(12);
  });
  it('payload de CloudMailin: usa el "De:" visible, el HTML sin cita y solo imágenes adjuntas', () => {
    const c = correoDeCloudMailin(payload());
    expect(c.de).toBe('luis@cliente.mx');
    expect(c.nombreDe).toBe('Luis Pérez');
    expect(c.cuerpo).toBe('Ya quedó, gracias.');
    expect(c.adjuntos?.map((a) => a.nombre)).toEqual(['pantalla.png']);
  });
});

describe('correo entrante por webhook (CloudMailin)', () => {
  let tickets: InMemoryTicketRepository;
  let config: InMemoryConfiguracionRepository;
  let adjuntos: InMemoryAdjuntoTicketRepository;
  let solicitudes: InMemoryTicketPublicoRepository;
  let email: FakeEmailSender;
  let service: CorreoEntranteService;

  beforeEach(async () => {
    tickets = new InMemoryTicketRepository(new InMemoryTicketStore());
    config = new InMemoryConfiguracionRepository();
    adjuntos = new InMemoryAdjuntoTicketRepository();
    solicitudes = new InMemoryTicketPublicoRepository();
    email = new FakeEmailSender();
    const usuarios = new InMemoryUsuarioRepository([
      new Usuario({ uid: 'u1', email: 'arturo@dattasoft.mx', nombre: 'Arturo', rol: 'admin' }),
    ]);
    let n = 0;
    service = new CorreoEntranteService(
      tickets,
      config,
      {} as IBuzonEntrante,
      { newId: () => `id-${++n}`, newToken: () => `t-${++n}` },
      new FixedClock(new Date('2026-10-02T16:00:00Z')),
      silentLogger,
      { adjuntos, solicitudes, usuarios, email, remitentesPropios: ['soporte@dattasoft.mx'] },
    );
    await tickets.save(
      new Ticket({
        id: 't7', numero: 7, asunto: 'No timbra', descripcion: 'Falla al timbrar',
        contactoCorreo: 'luis@cliente.mx', estado: 'Abierto', prioridad: 'Media', tipo: 'General', canal: 'interno',
      }),
    );
    config.config = { ...config.config, correosNotificacion: ['equipo@dattasoft.mx'] };
  });

  it('respuesta del cliente → nota con su nombre, la captura y aviso al equipo', async () => {
    const r = await service.recibirWebhook(correoDeCloudMailin(payload()));
    expect(r).toEqual({ accion: 'nota', ticket: 7 });
    const [nota] = await tickets.listarNotas('t7');
    expect(nota).toMatchObject({ cuerpo: 'Ya quedó, gracias.', autorNombre: 'Luis Pérez', correoDe: 'luis@cliente.mx', tipo: 'publica' });
    expect(nota!.adjuntoIds).toHaveLength(1);
    expect(adjuntos.docs.get(nota!.adjuntoIds![0]!)).toMatchObject({ ticketId: 't7', contentType: 'image/png' });
    expect(email.ultimo?.asunto).toContain('[Ticket #7]');
    expect((await tickets.listarEventos('t7')).at(-1)?.resumen).toContain('Luis Pérez respondió por correo');
  });

  it('anti-bucle: lo que manda el propio CRM se ignora, aunque traiga [Ticket #N]', async () => {
    const r = await service.recibirWebhook(
      correoDeCloudMailin(payload({ headers: { from: 'DATTASOFT <soporte@dattasoft.mx>', subject: '💬 Respuesta de cliente — [Ticket #7] No timbra' } })),
    );
    expect(r.accion).toBe('ignorado');
    expect(await tickets.listarNotas('t7')).toHaveLength(0);
    expect(email.enviados).toHaveLength(0);
  });

  it('un usuario del CRM en copia puede contestar; un tercero no', async () => {
    const delEquipo = await service.recibirWebhook(correoDeCloudMailin(payload({ headers: { from: 'Arturo <arturo@dattasoft.mx>', subject: 'RE: [Ticket #7] No timbra' } })));
    expect(delEquipo.accion).toBe('nota');
    const tercero = await service.recibirWebhook(correoDeCloudMailin(payload({ headers: { from: 'x@ajeno.mx', subject: 'RE: [Ticket #7] No timbra' } })));
    expect(tercero).toMatchObject({ accion: 'ignorado' });
  });

  it('sin número de ticket → solicitud en el buzón (nunca un ticket solo)', async () => {
    const r = await service.recibirWebhook(
      correoDeCloudMailin(payload({ headers: { from: 'Ana Ruiz <ana@nueva.mx>', subject: 'No abre CONTPAQi' }, plain: 'Me marca error al abrir', html: '' })),
    );
    expect(r.accion).toBe('solicitud');
    const [s] = [...solicitudes.items.values()];
    expect(s).toMatchObject({ origen: 'correo', nombre: 'Ana Ruiz', correo: 'ana@nueva.mx', asunto: 'No abre CONTPAQi', descripcion: 'Me marca error al abrir' });
    expect(s!.imagenes).toHaveLength(1);
  });
});
