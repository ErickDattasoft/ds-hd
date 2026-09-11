import { beforeEach, describe, expect, it } from 'vitest';
import { AvisarEmpresasService } from '../../src/application/empresas/AvisarEmpresasService.js';
import { BitacoraService } from '../../src/application/shared/BitacoraService.js';
import { Empresa } from '../../src/core/entities/Empresa.js';
import { Contacto } from '../../src/core/entities/Contacto.js';
import { VersionSistema } from '../../src/core/entities/VersionSistema.js';
import { ForbiddenError } from '../../src/core/errors/DomainError.js';
import type { SessionUser } from '../../src/application/shared/SessionUser.js';
import { InMemoryEmpresaRepository, InMemoryContactoRepository, InMemoryBitacoraRepository } from '../fakes/crm.js';
import { InMemoryVersionRepository } from '../fakes/kb.js';
import { InMemoryConfiguracionRepository } from '../fakes/tickets.js';
import { FakeEmailSender } from '../fakes/FakeEmailSender.js';
import { FixedClock, silentLogger } from '../fakes/support.js';
import type { IIntegracionesGateway, ResultadoPrueba } from '../../src/core/ports/services/IIntegracionesGateway.js';

class FakeIntegracionesGateway implements IIntegracionesGateway {
  readonly webhooksLlamados: { url: string; payload: Record<string, unknown> }[] = [];
  async postWebhook(url: string, payload: Record<string, unknown>): Promise<ResultadoPrueba> {
    this.webhooksLlamados.push({ url, payload });
    return { ok: true, detalle: 'HTTP 200' };
  }
  async enviarWhatsApp(): Promise<ResultadoPrueba> {
    return { ok: true, detalle: 'no usado en estos tests' };
  }
}

let seq = 0;
const ids = { newId: () => `id-${++seq}`, newToken: () => `tok-${++seq}` };

const actor = (over: Partial<SessionUser> = {}): SessionUser => ({
  uid: 'ventas1',
  nombre: 'Ventas',
  email: 'v@d.com',
  roles: ['ventas'],
  rol: 'ventas',
  esTecnico: false,
  empresaId: null,
  activo: true,
  esStaff: true,
  esCliente: false,
  permisos: ['empresas:editar'],
  ...over,
});

describe('AvisarEmpresasService', () => {
  let empresas: InMemoryEmpresaRepository;
  let contactos: InMemoryContactoRepository;
  let versiones: InMemoryVersionRepository;
  let config: InMemoryConfiguracionRepository;
  let email: FakeEmailSender;
  let gateway: FakeIntegracionesGateway;
  let bitacora: InMemoryBitacoraRepository;
  let clock: FixedClock;
  let service: AvisarEmpresasService;

  beforeEach(() => {
    seq = 0;
    empresas = new InMemoryEmpresaRepository();
    contactos = new InMemoryContactoRepository();
    versiones = new InMemoryVersionRepository();
    config = new InMemoryConfiguracionRepository();
    email = new FakeEmailSender();
    gateway = new FakeIntegracionesGateway();
    bitacora = new InMemoryBitacoraRepository();
    clock = new FixedClock(new Date('2026-09-01T12:00:00Z'));
    service = new AvisarEmpresasService(
      empresas,
      contactos,
      versiones,
      config,
      email,
      gateway,
      new BitacoraService(bitacora, ids, clock, silentLogger),
      clock,
    );
  });

  it('avisa versiones a una empresa con sistema desactualizado, sustituye comodines y marca el aviso', async () => {
    await versiones.save(new VersionSistema({ id: 'v1', sistema: 'Contabilidad', versionActual: '19.1.0' }));
    const empresa = new Empresa({
      id: 'e1',
      nombre: 'Empresa Uno',
      sistemasContratados: ['Contabilidad'],
      versionesInstaladas: { Contabilidad: '18.0.0' },
    });
    await empresas.save(empresa);
    const contacto = new Contacto({ id: 'c1', nombre: 'Cliente Uno', empresaId: 'e1', email: 'cliente@uno.com' });
    await contactos.save(contacto);

    const resultados = await service.ejecutar({ actor: actor(), empresaIds: ['e1'], tipo: 'versiones' });

    expect(resultados).toEqual([{ empresaId: 'e1', empresaNombre: 'Empresa Uno', enviado: true }]);
    expect(email.enviados).toHaveLength(1);
    expect(email.enviados[0]!.para).toEqual([{ email: 'cliente@uno.com', nombre: 'Cliente Uno' }]);
    expect(email.enviados[0]!.texto).toContain('Cliente Uno');
    expect(email.enviados[0]!.texto).toContain('Empresa Uno');
    expect(email.enviados[0]!.texto).toContain('Contabilidad: instalada 18.0.0, oficial 19.1.0');
    const guardada = await empresas.findById('e1');
    expect(guardada?.ultimoAvisoVersionesEn).toEqual(clock.now());
    expect(bitacora.entradas).toHaveLength(1);
    expect(bitacora.entradas[0]!.modulo).toBe('empresas');
  });

  it('no envía si la empresa no tiene nada pendiente', async () => {
    await versiones.save(new VersionSistema({ id: 'v1', sistema: 'Contabilidad', versionActual: '19.1.0' }));
    await empresas.save(
      new Empresa({
        id: 'e2',
        nombre: 'Empresa Al Día',
        sistemasContratados: ['Contabilidad'],
        versionesInstaladas: { Contabilidad: '19.1.0' },
      }),
    );

    const resultados = await service.ejecutar({ actor: actor(), empresaIds: ['e2'], tipo: 'versiones' });

    expect(resultados).toEqual([
      { empresaId: 'e2', empresaNombre: 'Empresa Al Día', enviado: false, motivo: 'sin_pendientes' },
    ]);
    expect(email.enviados).toHaveLength(0);
  });

  it('reporta sin_contacto_correo si nadie en la empresa tiene correo', async () => {
    await versiones.save(new VersionSistema({ id: 'v1', sistema: 'Contabilidad', versionActual: '19.1.0' }));
    await empresas.save(
      new Empresa({
        id: 'e3',
        nombre: 'Sin Correo',
        sistemasContratados: ['Contabilidad'],
        versionesInstaladas: { Contabilidad: '1.0.0' },
      }),
    );
    await contactos.save(new Contacto({ id: 'c3', nombre: 'Sin correo', empresaId: 'e3' }));

    const resultados = await service.ejecutar({ actor: actor(), empresaIds: ['e3'], tipo: 'versiones' });

    expect(resultados[0]).toMatchObject({ enviado: false, motivo: 'sin_contacto_correo' });
    expect(email.enviados).toHaveLength(0);
  });

  it('sin permiso empresas:editar no se puede avisar', async () => {
    await expect(
      service.ejecutar({ actor: actor({ permisos: [] }), empresaIds: ['e1'], tipo: 'versiones' }),
    ).rejects.toThrow(ForbiddenError);
  });

  it('avisa por WhatsApp (webhook n8n) cuando el canal es whatsapp y hay teléfono', async () => {
    await versiones.save(new VersionSistema({ id: 'v1', sistema: 'Contabilidad', versionActual: '19.1.0' }));
    await empresas.save(
      new Empresa({
        id: 'e4',
        nombre: 'Empresa WhatsApp',
        sistemasContratados: ['Contabilidad'],
        versionesInstaladas: { Contabilidad: '18.0.0' },
      }),
    );
    await contactos.save(new Contacto({ id: 'c4', nombre: 'Cliente Cuatro', empresaId: 'e4', celular: '9991234567' }));
    const integraciones = await config.obtenerIntegraciones();
    await config.guardarIntegraciones({ ...integraciones, n8nWebhookEmpresas: 'https://n8n.example.com/wh' });

    const resultados = await service.ejecutar({
      actor: actor(),
      empresaIds: ['e4'],
      tipo: 'versiones',
      canal: 'whatsapp',
    });

    expect(resultados).toEqual([{ empresaId: 'e4', empresaNombre: 'Empresa WhatsApp', enviado: true }]);
    expect(email.enviados).toHaveLength(0);
    expect(gateway.webhooksLlamados).toHaveLength(1);
    expect(gateway.webhooksLlamados[0]!.url).toBe('https://n8n.example.com/wh');
    expect(gateway.webhooksLlamados[0]!.payload).toMatchObject({
      evento: 'empresa.avisar_whatsapp',
      empresaId: 'e4',
      telefono: '9991234567',
    });
    expect((await empresas.findById('e4'))?.ultimoAvisoVersionesEn).toEqual(clock.now());
  });

  it('WhatsApp sin webhook configurado reporta sin_webhook_configurado', async () => {
    await versiones.save(new VersionSistema({ id: 'v1', sistema: 'Contabilidad', versionActual: '19.1.0' }));
    await empresas.save(
      new Empresa({
        id: 'e5',
        nombre: 'Sin Webhook',
        sistemasContratados: ['Contabilidad'],
        versionesInstaladas: { Contabilidad: '18.0.0' },
      }),
    );
    await contactos.save(new Contacto({ id: 'c5', nombre: 'Cliente Cinco', empresaId: 'e5', celular: '9991234567' }));

    const resultados = await service.ejecutar({
      actor: actor(),
      empresaIds: ['e5'],
      tipo: 'versiones',
      canal: 'whatsapp',
    });

    expect(resultados[0]).toMatchObject({ enviado: false, motivo: 'sin_webhook_configurado' });
    expect(gateway.webhooksLlamados).toHaveLength(0);
  });

  it('WhatsApp sin ningún contacto con teléfono reporta sin_contacto_telefono', async () => {
    await versiones.save(new VersionSistema({ id: 'v1', sistema: 'Contabilidad', versionActual: '19.1.0' }));
    await empresas.save(
      new Empresa({
        id: 'e6',
        nombre: 'Sin Telefono',
        sistemasContratados: ['Contabilidad'],
        versionesInstaladas: { Contabilidad: '18.0.0' },
      }),
    );
    await contactos.save(new Contacto({ id: 'c6', nombre: 'Cliente Seis', empresaId: 'e6', email: 'c6@x.com' }));
    const integraciones = await config.obtenerIntegraciones();
    await config.guardarIntegraciones({ ...integraciones, n8nWebhookEmpresas: 'https://n8n.example.com/wh' });

    const resultados = await service.ejecutar({
      actor: actor(),
      empresaIds: ['e6'],
      tipo: 'versiones',
      canal: 'whatsapp',
    });

    expect(resultados[0]).toMatchObject({ enviado: false, motivo: 'sin_contacto_telefono' });
  });
});
