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
  leidos: string[] = [];
  async listarNoLeidos(): Promise<CorreoRecibido[]> {
    return this.correos;
  }
  async marcarLeido(_cfg: ConfiguracionCorreoEntrante, correo: CorreoRecibido): Promise<void> {
    this.leidos.push(correo.id);
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
    config.correoEntrante = { ...config.correoEntrante, habilitado: true };
  });

  it('agrega la respuesta como nota pública, sin el hilo citado, y marca el correo leído', async () => {
    buzon.correos = [correo()];
    const r = await service.revisar();
    expect(r).toMatchObject({ revisados: 1, agregados: 1 });
    const notas = await tickets.listarNotas('t7');
    expect(notas).toHaveLength(1);
    expect(notas[0]!.cuerpo).toBe('Sigue igual, gracias.');
    expect(notas[0]!.tipo).toBe('publica');
    expect(notas[0]!.autorNombre).toContain('luis@cliente.mx');
    expect(buzon.leidos).toEqual(['m1']);
    expect((await config.obtenerCorreoEntrante()).ultimoResultado).toContain('1 de 1');
  });

  it('omite (y deja sin leer) lo que no se puede ligar a un ticket', async () => {
    buzon.correos = [
      correo({ id: 'a', asunto: 'Consulta general' }),
      correo({ id: 'b', asunto: 'Ticket #999' }),
      correo({ id: 'c', de: 'otro@ajeno.mx' }),
      correo({ id: 'd', cuerpo: '> solo cita' }),
    ];
    const r = await service.revisar();
    expect(r.agregados).toBe(0);
    expect(r.omitidos.map((o) => o.motivo)).toEqual([
      'el asunto no trae número de ticket',
      'no existe el ticket #999',
      'otro@ajeno.mx no es el contacto del ticket #7',
      'el correo llegó vacío',
    ]);
    expect(buzon.leidos).toEqual([]);
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
