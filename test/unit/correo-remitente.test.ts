import { beforeEach, describe, expect, it } from 'vitest';
import { CorreoEntranteService } from '../../src/application/tickets/CorreoEntranteService.js';
import { RemitenteEmailSender } from '../../src/infrastructure/email/RemitenteEmailSender.js';
import { correoDeCloudMailin } from '../../src/infrastructure/email/CloudMailinCorreo.js';
import { Ticket } from '../../src/core/entities/Ticket.js';
import type { IBuzonEntrante } from '../../src/core/ports/services/IBuzonEntrante.js';
import type { SessionUser } from '../../src/application/shared/SessionUser.js';
import {
  InMemoryConfiguracionRepository,
  InMemoryTicketPublicoRepository,
  InMemoryTicketRepository,
  InMemoryTicketStore,
} from '../fakes/tickets.js';
import { FakeEmailSender } from '../fakes/FakeEmailSender.js';
import { FixedClock, silentLogger } from '../fakes/support.js';

const ADMIN = { uid: 'a', permisos: ['configuracion:integraciones'] } as unknown as SessionUser;

describe('remitente y clave del webhook desde Configuración', () => {
  let config: InMemoryConfiguracionRepository;
  let tickets: InMemoryTicketRepository;
  let verificados: string[];
  const crear = (deps: Partial<ConstructorParameters<typeof CorreoEntranteService>[6]> = {}) => {
    let n = 0;
    return new CorreoEntranteService(
      tickets,
      config,
      {} as IBuzonEntrante,
      { newId: () => `id-${++n}`, newToken: () => `clave-${++n}` },
      new FixedClock(new Date('2026-10-27T16:00:00Z')),
      silentLogger,
      {
        solicitudes: new InMemoryTicketPublicoRepository(),
        remitentesPropios: ['soporte@dattasoft.mx'],
        verificarRemitente: async (email) =>
          verificados.includes(email) ? { ok: true, detalle: `${email} está verificado` } : { ok: false, detalle: `${email} no está en Brevo` },
        ...deps,
      },
    );
  };

  beforeEach(async () => {
    config = new InMemoryConfiguracionRepository();
    tickets = new InMemoryTicketRepository(new InMemoryTicketStore());
    verificados = ['servicio@dattasoft.mx'];
    await tickets.save(
      new Ticket({
        id: 't7', numero: 7, asunto: 'No timbra', descripcion: 'Falla al timbrar',
        contactoCorreo: 'luis@cliente.mx', estado: 'Abierto', prioridad: 'Media', tipo: 'General', canal: 'interno',
      }),
    );
  });

  it('guarda un remitente verificado; uno sin verificar no cambia nada', async () => {
    const s = crear();
    await expect(s.guardarRemitente(ADMIN, { email: 'otro@dattasoft.mx', nombre: '' })).rejects.toThrow('no está en Brevo');
    expect(config.correoEntrante.remitenteEmail).toBe('');
    await s.guardarRemitente(ADMIN, { email: ' Servicio@Dattasoft.mx ', nombre: 'Soporte DATTASOFT' });
    expect(config.correoEntrante).toMatchObject({ remitenteEmail: 'servicio@dattasoft.mx', remitenteNombre: 'Soporte DATTASOFT' });
    await s.guardarRemitente(ADMIN, { email: '', nombre: '' });
    expect(config.correoEntrante.remitenteEmail).toBe('');
  });

  it('anti-bucle: también ignora lo que llega desde el remitente configurado', async () => {
    config.correoEntrante = { ...config.correoEntrante, remitenteEmail: 'servicio@dattasoft.mx' };
    const r = await crear().recibirWebhook(
      correoDeCloudMailin({ headers: { from: 'servicio@dattasoft.mx', subject: '💬 Respuesta — [Ticket #7] No timbra' }, plain: 'x' }),
    );
    expect(r).toMatchObject({ accion: 'ignorado', motivo: 'remitente es el propio CRM' });
  });

  it('la clave generada abre el webhook; al rotarla la anterior deja de servir', async () => {
    const s = crear();
    expect(await s.claveWebhookValida('cualquiera')).toBe(false);
    const k1 = await s.generarClaveWebhook(ADMIN);
    expect(await s.claveWebhookValida(k1)).toBe(true);
    const k2 = await s.generarClaveWebhook(ADMIN);
    expect(await s.claveWebhookValida(k1)).toBe(false);
    expect(await s.claveWebhookValida(k2)).toBe(true);
    expect(await s.claveWebhookValida('')).toBe(false);
  });

  it('el secreto del servidor sigue valiendo junto con la clave generada', async () => {
    const s = crear({ secretoServidor: 'del-servidor' });
    expect(await s.claveWebhookValida('del-servidor')).toBe(true);
    expect(s.webhookActivo(config.correoEntrante)).toBe(true);
  });

  it('el decorador pone el remitente configurado; sin config sale el del servidor', async () => {
    const fake = new FakeEmailSender();
    const sender = new RemitenteEmailSender(fake, config);
    await sender.enviar({ para: [{ email: 'x@y.mx' }], asunto: 'a', html: 'b' });
    expect(fake.ultimo?.de).toBeUndefined();
    config.correoEntrante = { ...config.correoEntrante, remitenteEmail: 'servicio@dattasoft.mx', remitenteNombre: 'Soporte' };
    await sender.enviar({ para: [{ email: 'x@y.mx' }], asunto: 'a', html: 'b' });
    expect(fake.ultimo?.de).toEqual({ email: 'servicio@dattasoft.mx', nombre: 'Soporte' });
  });
});
