import { beforeEach, describe, expect, it } from 'vitest';
import { ConfiguracionIntegracionesService } from '../../src/application/configuracion/ConfiguracionIntegracionesService.js';
import { sanearReglas } from '../../src/core/entities/ConfiguracionIntegraciones.js';
import { N8nWebhookPublisher } from '../../src/infrastructure/webhooks/N8nWebhookPublisher.js';
import { ForbiddenError, ValidationError } from '../../src/core/errors/DomainError.js';
import type { SessionUser } from '../../src/application/shared/SessionUser.js';
import type {
  IIntegracionesGateway,
  ResultadoPrueba,
} from '../../src/core/ports/services/IIntegracionesGateway.js';
import { InMemoryConfiguracionRepository } from '../fakes/tickets.js';
import { silentLogger } from '../fakes/support.js';
import { FakeEmailSender } from '../fakes/FakeEmailSender.js';
import type { InfoCorreo } from '../../src/application/configuracion/ConfiguracionIntegracionesService.js';

class FakeIntegracionesGateway implements IIntegracionesGateway {
  readonly webhooksLlamados: { url: string; payload: Record<string, unknown> }[] = [];
  readonly whatsappLlamados: { telefono: string; apiKey: string; mensaje: string }[] = [];
  resultadoWebhook: ResultadoPrueba = { ok: true, detalle: 'HTTP 200' };
  resultadoWhatsapp: ResultadoPrueba = { ok: true, detalle: 'Message queued' };

  async postWebhook(url: string, payload: Record<string, unknown>): Promise<ResultadoPrueba> {
    this.webhooksLlamados.push({ url, payload });
    return this.resultadoWebhook;
  }

  async enviarWhatsApp(telefono: string, apiKey: string, mensaje: string): Promise<ResultadoPrueba> {
    this.whatsappLlamados.push({ telefono, apiKey, mensaje });
    return this.resultadoWhatsapp;
  }
}

const actor = (over: Partial<SessionUser> = {}): SessionUser => ({
  uid: 'admin1',
  nombre: 'Admin',
  email: 'a@d.com',
  roles: ['admin'],
  rol: 'admin',
  esTecnico: false,
  empresaId: null,
  activo: true,
  esStaff: true,
  esCliente: false,
  permisos: ['configuracion:integraciones'],
  ...over,
});

describe('ConfiguracionIntegracionesService', () => {
  let repo: InMemoryConfiguracionRepository;
  let gateway: FakeIntegracionesGateway;
  let email: FakeEmailSender;
  let service: ConfiguracionIntegracionesService;
  const infoCorreo: InfoCorreo = { modo: 'brevo', remitente: 'soporte@dattasoft.mx' };

  beforeEach(() => {
    repo = new InMemoryConfiguracionRepository();
    gateway = new FakeIntegracionesGateway();
    email = new FakeEmailSender();
    service = new ConfiguracionIntegracionesService(repo, gateway, email, infoCorreo, silentLogger);
  });

  it('sin permiso no se puede actualizar', async () => {
    await expect(
      service.actualizar({
        actor: actor({ permisos: [] }),
        n8nWebhookTickets: '',
        n8nWebhookCotizaciones: '',
        n8nWebhookEmpresas: '',
        whatsappHabilitado: false,
        whatsappTelefono: '',
        whatsappApiKey: '',
        reglas: {},
      }),
    ).rejects.toThrow(ForbiddenError);
  });

  it('rechaza una URL de webhook no válida', async () => {
    await expect(
      service.actualizar({
        actor: actor(),
        n8nWebhookTickets: 'no-es-una-url',
        n8nWebhookCotizaciones: '',
        n8nWebhookEmpresas: '',
        whatsappHabilitado: false,
        whatsappTelefono: '',
        whatsappApiKey: '',
        reglas: {},
      }),
    ).rejects.toThrow(ValidationError);
  });

  it('guarda la config con reglas saneadas', async () => {
    await service.actualizar({
      actor: actor(),
      n8nWebhookTickets: 'https://n8n.example.com/hook',
      n8nWebhookCotizaciones: '',
      n8nWebhookEmpresas: '',
      whatsappHabilitado: true,
      whatsappTelefono: '+521234567890',
      whatsappApiKey: 'abc123',
      reglas: { 'ticket.creado': { webhook: false, whatsapp: true } },
    });
    const config = await service.obtener();
    expect(config.n8nWebhookTickets).toBe('https://n8n.example.com/hook');
    expect(config.whatsappHabilitado).toBe(true);
    expect(config.reglas['ticket.creado']).toEqual({ webhook: false, whatsapp: true });
    expect(config.reglas['ticket.cerrado']).toEqual({ webhook: true, whatsapp: false });
  });

  it('probarWebhook delega al gateway y exige permiso', async () => {
    await expect(service.probarWebhook(actor({ permisos: [] }), 'https://x.com')).rejects.toThrow(ForbiddenError);
    const r = await service.probarWebhook(actor(), 'https://x.com');
    expect(r.ok).toBe(true);
    expect(gateway.webhooksLlamados).toHaveLength(1);
  });

  it('probarWhatsApp delega al gateway y exige permiso', async () => {
    const r = await service.probarWhatsApp(actor(), '+521234567890', 'clave');
    expect(r.ok).toBe(true);
    expect(gateway.whatsappLlamados).toHaveLength(1);
  });

  it('probarCorreo exige permiso y valida el destino', async () => {
    await expect(service.probarCorreo(actor({ permisos: [] }), 'a@b.com')).rejects.toThrow(ForbiddenError);
    const invalido = await service.probarCorreo(actor(), 'no-es-correo');
    expect(invalido.ok).toBe(false);
    expect(email.enviados).toHaveLength(0);
  });

  it('probarCorreo envía y reporta el remitente', async () => {
    const r = await service.probarCorreo(actor(), 'destino@cliente.com');
    expect(r.ok).toBe(true);
    expect(r.detalle).toContain('soporte@dattasoft.mx');
    expect(email.ultimo?.para[0]?.email).toBe('destino@cliente.com');
    expect(email.ultimo?.tags).toContain('prueba-correo');
  });

  it('probarCorreo avisa cuando el servidor solo registra en el log', async () => {
    const soloLog = new ConfiguracionIntegracionesService(
      repo,
      gateway,
      email,
      { modo: 'log', remitente: 'soporte@dattasoft.mx' },
      silentLogger,
    );
    const r = await soloLog.probarCorreo(actor(), 'destino@cliente.com');
    expect(r.ok).toBe(false);
    expect(r.detalle).toContain('log');
    expect(email.enviados).toHaveLength(0);
  });

  it('probarCorreo reporta el error si el envío falla', async () => {
    email.fallar = true;
    const r = await service.probarCorreo(actor(), 'destino@cliente.com');
    expect(r.ok).toBe(false);
    expect(r.detalle).toContain('Brevo respondió 400');
  });
});

describe('N8nWebhookPublisher', () => {
  let repo: InMemoryConfiguracionRepository;
  let gateway: FakeIntegracionesGateway;
  let publisher: N8nWebhookPublisher;

  beforeEach(() => {
    repo = new InMemoryConfiguracionRepository();
    gateway = new FakeIntegracionesGateway();
    publisher = new N8nWebhookPublisher(
      gateway,
      repo,
      { tickets: 'https://env.example.com/tickets', cotizaciones: '' },
      silentLogger,
    );
  });

  it('usa la URL guardada en Firestore si existe', async () => {
    repo.integraciones = { ...repo.integraciones, n8nWebhookTickets: 'https://firestore.example.com/hook' };
    await publisher.publicar({ evento: 'ticket.creado', canal: 'tickets', payload: { numero: 1 } });
    expect(gateway.webhooksLlamados).toEqual([
      { url: 'https://firestore.example.com/hook', payload: expect.objectContaining({ evento: 'ticket.creado', numero: 1 }) },
    ]);
  });

  it('WhatsApp de un evento va solo a los destinatarios elegidos en su regla (vacío = todos)', async () => {
    repo.integraciones = {
      ...repo.integraciones,
      whatsappHabilitado: true,
      whatsappTelefono: '+5210000000001',
      whatsappApiKey: 'k1',
      whatsappOtros: [{ nombre: 'Gaby', telefono: '+5210000000002', apiKey: 'k2' }],
      reglas: {
        ...repo.integraciones.reglas,
        'ticket.nota_interna': { webhook: false, whatsapp: true, destinatarios: ['Gaby'] },
        'ticket.estado_cambiado': { webhook: false, whatsapp: true },
      },
    };
    await publisher.publicar({ evento: 'ticket.nota_interna', canal: 'tickets', payload: { numero: 7, nota: 'x' } });
    expect(gateway.whatsappLlamados.map((w) => w.telefono)).toEqual(['+5210000000002']);

    gateway.whatsappLlamados.length = 0;
    await publisher.publicar({ evento: 'ticket.estado_cambiado', canal: 'tickets', payload: { numero: 7 } });
    expect(gateway.whatsappLlamados.map((w) => w.telefono).sort()).toEqual(['+5210000000001', '+5210000000002']);
  });

  it('una config guardada antes de separar «ticket creado por el cliente» hereda la regla de «ticket creado»', () => {
    const reglas = sanearReglas({ 'ticket.creado': { webhook: false, whatsapp: true } });
    expect(reglas['ticket.creado_cliente']).toEqual({ webhook: false, whatsapp: true });
  });

  it('el recordatorio de ticket lleva a quién avisar, con la forma del CRM viejo', async () => {
    repo.integraciones = {
      ...repo.integraciones,
      whatsappTelefono: '+5219990000000',
      whatsappApiKey: 'K0',
      whatsappOtros: [{ nombre: 'Ana', telefono: '+5219991111111', apiKey: 'K1' }, { nombre: 'Luis', telefono: '+5219992222222', apiKey: 'K2' }],
    };
    await publisher.publicar({
      evento: 'ticket.programado',
      canal: 'tickets',
      payload: { numero: 7, asunto: 'Visita', fecha: '2026-10-01', hora: '10:00', empresaNombre: 'ACME', destinatarioNombres: ['Ana'] },
    });
    const p = gateway.webhooksLlamados[0]!.payload;
    expect(p.destinatarios).toEqual([{ nombre: 'Ana', telefono: '+5219991111111', apiKey: 'K1' }]);
    expect(p.ticket).toMatchObject({ numero: 7, empresa: 'ACME', fechaProgramada: '2026-10-01', horaProgramada: '10:00' });

    // Sin elegidos = todo el equipo (número principal incluido).
    await publisher.publicar({ evento: 'ticket.programado', canal: 'tickets', payload: { numero: 8, destinatarioNombres: [] } });
    expect((gateway.webhooksLlamados[1]!.payload.destinatarios as unknown[]).length).toBe(3);
  });

  it('cae al env var si Firestore no tiene URL configurada', async () => {
    await publisher.publicar({ evento: 'ticket.creado', canal: 'tickets', payload: { numero: 1 } });
    expect(gateway.webhooksLlamados[0]!.url).toBe('https://env.example.com/tickets');
  });

  it('no llama al webhook si la regla del evento lo tiene deshabilitado', async () => {
    repo.integraciones = {
      ...repo.integraciones,
      reglas: { ...repo.integraciones.reglas, 'ticket.creado': { webhook: false, whatsapp: false } },
    };
    await publisher.publicar({ evento: 'ticket.creado', canal: 'tickets', payload: { numero: 1 } });
    expect(gateway.webhooksLlamados).toHaveLength(0);
  });

  it('envía WhatsApp cuando la regla lo pide y WhatsApp está habilitado y configurado', async () => {
    repo.integraciones = {
      ...repo.integraciones,
      whatsappHabilitado: true,
      whatsappTelefono: '+521234567890',
      whatsappApiKey: 'clave',
      reglas: { ...repo.integraciones.reglas, 'ticket.creado': { webhook: false, whatsapp: true } },
    };
    await publisher.publicar({ evento: 'ticket.creado', canal: 'tickets', payload: { numero: 7, asunto: 'Falla' } });
    expect(gateway.whatsappLlamados).toHaveLength(1);
    expect(gateway.whatsappLlamados[0]!.mensaje).toContain('#7');
  });

  it('envía el WhatsApp al número principal y a las demás personas', async () => {
    repo.integraciones = {
      ...repo.integraciones,
      whatsappHabilitado: true,
      whatsappTelefono: '+521234567890',
      whatsappApiKey: 'clave',
      whatsappOtros: [{ nombre: 'Ana', telefono: '+5211111111', apiKey: 'K1' }],
      reglas: { ...repo.integraciones.reglas, 'ticket.creado': { webhook: false, whatsapp: true } },
    };
    await publisher.publicar({ evento: 'ticket.creado', canal: 'tickets', payload: { numero: 8 } });
    expect(gateway.whatsappLlamados).toHaveLength(2);
  });

  it('no envía WhatsApp si la regla lo pide pero el canal no está habilitado', async () => {
    repo.integraciones = {
      ...repo.integraciones,
      whatsappHabilitado: false,
      whatsappTelefono: '+521234567890',
      whatsappApiKey: 'clave',
      reglas: { ...repo.integraciones.reglas, 'ticket.creado': { webhook: false, whatsapp: true } },
    };
    await publisher.publicar({ evento: 'ticket.creado', canal: 'tickets', payload: { numero: 7 } });
    expect(gateway.whatsappLlamados).toHaveLength(0);
  });
});
