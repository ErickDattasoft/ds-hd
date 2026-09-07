import { beforeEach, describe, expect, it } from 'vitest';
import { ConfiguracionIntegracionesService } from '../../src/application/configuracion/ConfiguracionIntegracionesService.js';
import { N8nWebhookPublisher } from '../../src/infrastructure/webhooks/N8nWebhookPublisher.js';
import { ForbiddenError, ValidationError } from '../../src/core/errors/DomainError.js';
import type { SessionUser } from '../../src/application/shared/SessionUser.js';
import type {
  IIntegracionesGateway,
  ResultadoPrueba,
} from '../../src/core/ports/services/IIntegracionesGateway.js';
import { InMemoryConfiguracionRepository } from '../fakes/tickets.js';
import { silentLogger } from '../fakes/support.js';

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
  let service: ConfiguracionIntegracionesService;

  beforeEach(() => {
    repo = new InMemoryConfiguracionRepository();
    gateway = new FakeIntegracionesGateway();
    service = new ConfiguracionIntegracionesService(repo, gateway, silentLogger);
  });

  it('sin permiso no se puede actualizar', async () => {
    await expect(
      service.actualizar({
        actor: actor({ permisos: [] }),
        n8nWebhookTickets: '',
        n8nWebhookCotizaciones: '',
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
