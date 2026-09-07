import { beforeEach, describe, expect, it } from 'vitest';
import { EventoService } from '../../src/application/eventos/EventoService.js';
import { BitacoraService } from '../../src/application/shared/BitacoraService.js';
import { Evento } from '../../src/core/entities/Evento.js';
import { esCorreoDesechable } from '../../src/core/entities/value-objects/dominiosDesechables.js';
import {
  InMemoryEventoRepository,
  InMemoryInscripcionRepository,
  InMemoryListaNegraRepository,
} from '../fakes/eventos.js';
import { InMemoryBitacoraRepository, InMemoryEmpresaRepository } from '../fakes/crm.js';
import { FakeCaptchaVerifier } from '../fakes/tickets.js';
import { FakeEmailSender } from '../fakes/FakeEmailSender.js';
import { FixedClock, silentLogger } from '../fakes/support.js';

let seq = 0;
const ids = { newId: () => `id-${++seq}`, newToken: () => `tok-${++seq}` };

describe('esCorreoDesechable', () => {
  it('detecta dominios desechables comunes y deja pasar los normales', () => {
    expect(esCorreoDesechable('x@mailinator.com')).toBe(true);
    expect(esCorreoDesechable('x@YOPMAIL.com')).toBe(true);
    expect(esCorreoDesechable('juan@empresa.com.mx')).toBe(false);
    expect(esCorreoDesechable('juan@gmail.com')).toBe(false);
  });
});

describe('EventoService — antiabuso de registro público', () => {
  let eventos: InMemoryEventoRepository;
  let inscripciones: InMemoryInscripcionRepository;
  let service: EventoService;

  beforeEach(() => {
    seq = 0;
    eventos = new InMemoryEventoRepository();
    inscripciones = new InMemoryInscripcionRepository();
    const bitacora = new BitacoraService(
      new InMemoryBitacoraRepository(),
      ids,
      new FixedClock(new Date('2026-09-01T09:00:00Z')),
      silentLogger,
    );
    service = new EventoService(
      eventos,
      inscripciones,
      new InMemoryListaNegraRepository(),
      new InMemoryEmpresaRepository(),
      new FakeCaptchaVerifier(),
      new FakeEmailSender(),
      ids,
      new FixedClock(new Date('2026-09-01T09:00:00Z')),
      silentLogger,
      bitacora,
      'https://ds-hd.test',
    );
    eventos.items.set(
      'ev1',
      new Evento({
        id: 'ev1',
        titulo: 'Webinar',
        fechaHora: new Date(Date.now() + 7 * 86_400_000),
        estado: 'publicado',
        limiteRegistrosPorIp: 2,
      }),
    );
  });

  const registrar = (email: string, ip: string) =>
    service.registrarPublico({ eventoId: 'ev1', nombre: 'Prospecto', email, ip });

  it('marca correoSospechoso y guarda la IP', async () => {
    const ins = await registrar('quien@mailinator.com', '203.0.113.7');
    expect(ins.correoSospechoso).toBe(true);
    expect(ins.ip).toBe('203.0.113.7');
  });

  it('aplica el límite de registros por IP del evento', async () => {
    await registrar('a@empresa.com', '198.51.100.1');
    await registrar('b@empresa.com', '198.51.100.1');
    await expect(registrar('c@empresa.com', '198.51.100.1')).rejects.toThrow(/límite de registros/i);
    // Otra IP no está topada.
    await expect(registrar('d@empresa.com', '198.51.100.2')).resolves.toBeTruthy();
  });

  it('sin evento.limiteRegistrosPorIp usa el default de 5', async () => {
    eventos.items.set(
      'ev2',
      new Evento({ id: 'ev2', titulo: 'Otro', fechaHora: new Date(Date.now() + 7 * 86_400_000), estado: 'publicado' }),
    );
    for (let i = 0; i < 5; i++) {
      await service.registrarPublico({ eventoId: 'ev2', nombre: 'Prospecto', email: `p${i}@e.com`, ip: '10.0.0.9' });
    }
    await expect(
      service.registrarPublico({ eventoId: 'ev2', nombre: 'Prospecto', email: 'p6@e.com', ip: '10.0.0.9' }),
    ).rejects.toThrow(/límite de registros/i);
  });
});
