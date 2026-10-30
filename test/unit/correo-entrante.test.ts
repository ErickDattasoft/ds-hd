import { beforeEach, describe, expect, it } from 'vitest';
import { CorreoEntranteService } from '../../src/application/tickets/CorreoEntranteService.js';
import { cuerpoSinCita, numeroTicketDeAsunto } from '../../src/core/entities/ConfiguracionCorreoEntrante.js';
import { aTextoPlano, extraerCorreo } from '../../src/infrastructure/email/ZohoBuzonEntrante.js';
import type { ConfiguracionCorreoEntrante } from '../../src/core/entities/ConfiguracionCorreoEntrante.js';
import type { CorreoRecibido, IBuzonEntrante } from '../../src/core/ports/services/IBuzonEntrante.js';
import { Ticket } from '../../src/core/entities/Ticket.js';
import { InMemoryTicketRepository, InMemoryConfiguracionRepository, InMemoryTicketStore } from '../fakes/tickets.js';
import { FixedClock, silentLogger } from '../fakes/support.js';

class FakeBuzon implements IBuzonEntrante {
  correos: CorreoRecibido[] = [];
  pedidos: { desde: Date; soloConAdjuntos: boolean }[] = [];
  async listarRecientes(
    _cfg: ConfiguracionCorreoEntrante,
    opts: { desde: Date; soloConAdjuntos: boolean; limite: number },
  ): Promise<CorreoRecibido[]> {
    this.pedidos.push({ desde: opts.desde, soloConAdjuntos: opts.soloConAdjuntos });
    return this.correos.filter((c) => c.recibidoEn > opts.desde);
  }
  async canjearCodigo(): Promise<string> {
    return 'refresh-de-prueba';
  }
  async verificar(): Promise<{ accountId: string; correo: string }> {
    return { accountId: 'acc1', correo: 'soporte@dattasoft.mx' };
  }
}

const correo = (over: Partial<CorreoRecibido> = {}): CorreoRecibido => ({
  id: 'm1',
  carpetaId: 'f1',
  de: 'luis@cliente.mx',
  asunto: 'Re: [Ticket #7] No timbra',
  cuerpo: 'Sigue igual, gracias.\n\nEl 1 de enero escribió:\n> texto viejo',
  recibidoEn: new Date('2026-09-17T10:00:00Z'),
  ...over,
});

describe('correo entrante (Zoho)', () => {
  let buzon: FakeBuzon;
  let tickets: InMemoryTicketRepository;
  let config: InMemoryConfiguracionRepository;
  let service: CorreoEntranteService;

  beforeEach(async () => {
    buzon = new FakeBuzon();
    tickets = new InMemoryTicketRepository(new InMemoryTicketStore());
    config = new InMemoryConfiguracionRepository();
    let n = 0;
    service = new CorreoEntranteService(
      tickets,
      config,
      buzon,
      { newId: () => `id-${++n}`, newToken: () => `t-${++n}` },
      new FixedClock(new Date('2026-09-17T12:00:00Z')),
      silentLogger,
    );
    await tickets.save(
      new Ticket({
        id: 't7',
        numero: 7,
        asunto: 'No timbra',
        descripcion: 'Falla al timbrar',
        contactoCorreo: 'luis@cliente.mx',
        estado: 'Abierto',
        prioridad: 'Media',
        tipo: 'General',
        canal: 'interno',
      }),
    );
    config.correoEntrante = { ...config.correoEntrante, habilitado: true, zohoRevisadoHasta: '2026-09-17T09:00:00Z' };
  });

  it('agrega la respuesta como nota pública, sin el hilo citado, y recuerda hasta dónde revisó', async () => {
    buzon.correos = [correo()];
    const r = await service.revisar();
    expect(r).toMatchObject({ revisados: 1, agregados: 1 });
    const notas = await tickets.listarNotas('t7');
    expect(notas).toHaveLength(1);
    expect(notas[0]!.cuerpo).toBe('Sigue igual, gracias.');
    expect(notas[0]!.tipo).toBe('publica');
    expect(notas[0]!.autorNombre).toContain('luis@cliente.mx');
    const cfg = await config.obtenerCorreoEntrante();
    expect(cfg.ultimoResultado).toContain('1 de 1');
    expect(cfg.zohoRevisadoHasta).toBe('2026-09-17T10:00:00.000Z');
    // La siguiente vuelta no lo vuelve a tomar.
    expect((await service.revisar()).revisados).toBe(0);
  });

  it('omite lo que no se puede ligar a un ticket', async () => {
    buzon.correos = [
      correo({ id: 'a', asunto: 'Consulta general' }),
      correo({ id: 'b', asunto: 'Ticket #999' }),
      correo({ id: 'c', de: 'otro@ajeno.mx' }),
      correo({ id: 'd', cuerpo: '   ' }),
    ];
    const r = await service.revisar();
    expect(r.agregados).toBe(0);
    expect(r.omitidos.map((o) => o.motivo)).toEqual([
      'el asunto no trae número de ticket',
      'no existe el ticket #999',
      'otro@ajeno.mx no es el contacto del ticket #7',
      'el correo llegó vacío',
    ]);
  });

  it('la primera vez solo mira la última hora; con CloudMailin activo pide solo los correos con adjuntos', async () => {
    config.correoEntrante = { ...config.correoEntrante, zohoRevisadoHasta: null };
    await service.revisar();
    expect(buzon.pedidos[0]).toEqual({ desde: new Date('2026-09-17T11:00:00Z'), soloConAdjuntos: false });
    config.correoEntrante = { ...config.correoEntrante, webhookKey: 'clave', zohoRevisadoHasta: null };
    await service.revisar();
    expect(buzon.pedidos[1]!.soloConAdjuntos).toBe(true);
  });

  it('no duplica una respuesta que ya llegó por CloudMailin', async () => {
    const c = correo({ recibidoEn: new Date('2026-09-17T10:00:00Z') });
    expect(await service.recibirWebhook(c)).toMatchObject({ accion: 'nota' });
    buzon.correos = [{ ...c, id: 'zoho-1', recibidoEn: new Date('2026-09-17T10:00:20Z') }];
    const r = await service.revisar();
    expect(r).toMatchObject({ revisados: 1, agregados: 0, omitidos: [] });
    expect(await tickets.listarNotas('t7')).toHaveLength(1);
    expect((await config.obtenerCorreoEntrante()).ultimoResultado).toContain('1 ya estaban');
  });

  it('con la revisión automática apagada no toca el buzón', async () => {
    config.correoEntrante = { ...config.correoEntrante, habilitado: false };
    buzon.correos = [correo()];
    expect(await service.revisar()).toMatchObject({ revisados: 0, agregados: 0 });
  });

  it('acepta a cualquier remitente si se apaga "solo el contacto"', async () => {
    config.correoEntrante = { ...config.correoEntrante, soloContactoDelTicket: false };
    buzon.correos = [correo({ de: 'otro@ajeno.mx' })];
    expect((await service.revisar()).agregados).toBe(1);
  });
});

describe('utilidades de correo entrante', () => {
  it('saca el número de ticket del asunto', () => {
    expect(numeroTicketDeAsunto('Re: [Ticket #123] algo')).toBe(123);
    expect(numeroTicketDeAsunto('Ticket # 8')).toBe(8);
    expect(numeroTicketDeAsunto('sin número')).toBeNull();
  });

  it('corta el hilo citado', () => {
    expect(cuerpoSinCita('Hola\n\n-----Mensaje original-----\nviejo')).toBe('Hola');
    expect(cuerpoSinCita('Hola\nDe: alguien')).toBe('Hola');
  });

  it('limpia HTML y direcciones', () => {
    expect(aTextoPlano('<p>Hola<br>mundo</p><style>x{}</style>')).toBe('Hola\nmundo');
    expect(extraerCorreo('Ana <ANA@x.mx>')).toBe('ana@x.mx');
  });
});

describe('cuerpoSinCita con la cita de Gmail partida en renglones', () => {
  it('corta «El … <» + «correo> escribió:»', () => {
    const texto = 'O2\n\nEl El vie, 30 de oct de 2026 a la(s) 10:30 am, DATTASOFT Soporte <\nerick.casas@dattasoft.mx> escribió:\n\n> viejo';
    expect(cuerpoSinCita(texto)).toBe('O2');
  });
  it('no se come lo que el cliente escribió con «El …» justo antes de la cita', () => {
    const texto = 'El sistema no abre desde el 30\nEl vie, 30 oct 2026, Soporte <s@x.mx> escribió:\n> viejo';
    expect(cuerpoSinCita(texto)).toBe('El sistema no abre desde el 30');
  });
});
