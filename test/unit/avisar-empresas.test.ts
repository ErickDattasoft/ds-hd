import { beforeEach, describe, expect, it } from 'vitest';
import { AvisarEmpresasService } from '../../src/application/empresas/AvisarEmpresasService.js';
import { BitacoraService } from '../../src/application/shared/BitacoraService.js';
import { Empresa } from '../../src/core/entities/Empresa.js';
import { Contacto } from '../../src/core/entities/Contacto.js';
import { VersionSistema } from '../../src/core/entities/VersionSistema.js';
import { ForbiddenError } from '../../src/core/errors/DomainError.js';
import type { SessionUser } from '../../src/application/shared/SessionUser.js';
import { InMemoryEmpresaRepository, InMemoryContactoRepository, InMemoryBitacoraRepository } from '../fakes/crm.js';
import { InMemoryUsuarioRepository } from '../fakes/InMemoryUsuarioRepository.js';
import { Usuario } from '../../src/core/entities/Usuario.js';
import { InMemoryVersionRepository } from '../fakes/kb.js';
import { InMemoryConfiguracionRepository } from '../fakes/tickets.js';
import { FakeEmailSender } from '../fakes/FakeEmailSender.js';
import { FixedClock, silentLogger } from '../fakes/support.js';
import { InMemoryAvisoRepository } from '../fakes/kb.js';
import { WHATSAPP_CLIENTES_POR_DEFECTO, type WhatsAppClientesConfig } from '../../src/core/entities/ConfiguracionIntegraciones.js';
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
  readonly business: { proveedor: string; telefono: string; mensaje: string }[] = [];
  respuestaBusiness: ResultadoPrueba = { ok: true, detalle: 'Enviado (id wamid.1)' };
  async enviarWhatsAppClientes(cfg: WhatsAppClientesConfig, telefono: string, mensaje: string): Promise<ResultadoPrueba> {
    this.business.push({ proveedor: cfg.proveedor, telefono, mensaje });
    return this.respuestaBusiness;
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
  let avisos: InMemoryAvisoRepository;
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
    avisos = new InMemoryAvisoRepository();
    service = new AvisarEmpresasService(
      empresas,
      contactos,
      versiones,
      config,
      email,
      gateway,
      new BitacoraService(bitacora, ids, clock, silentLogger),
      clock,
      avisos,
      ids,
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

  it('WhatsApp sin webhook configurado cae al respaldo manual (wa.me) como el CRM viejo', async () => {
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

    expect(resultados[0]!.enviado).toBe(true);
    expect(resultados[0]!.motivo).toBeUndefined();
    expect(resultados[0]!.whatsappManual?.telefono).toBe('529991234567');
    expect(resultados[0]!.whatsappManual?.mensaje).toBeTruthy();
    expect(gateway.webhooksLlamados).toHaveLength(0);
    expect((await empresas.findById('e5'))?.ultimoAvisoVersionesEn).toEqual(clock.now());
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

  it('con Meta configurado manda el WhatsApp solo; si la API falla deja el botón manual', async () => {
    await versiones.save(new VersionSistema({ id: 'v1', sistema: 'Contabilidad', versionActual: '19.1.0' }));
    await empresas.save(
      new Empresa({ id: 'e6', nombre: 'Con Meta', sistemasContratados: ['Contabilidad'], versionesInstaladas: { Contabilidad: '18.0.0' } }),
    );
    await contactos.save(new Contacto({ id: 'c6', nombre: 'Cliente Seis', empresaId: 'e6', celular: '999 123 4567' }));
    const integraciones = await config.obtenerIntegraciones();
    await config.guardarIntegraciones({
      ...integraciones,
      n8nWebhookEmpresas: 'https://n8n.example.com/wh',
      whatsappClientes: { ...WHATSAPP_CLIENTES_POR_DEFECTO, proveedor: 'meta', metaToken: 't', metaPhoneNumberId: '1', metaPlantilla: 'p' },
    });

    const [ok] = await service.ejecutar({ actor: actor(), empresaIds: ['e6'], tipo: 'versiones', canal: 'whatsapp' });
    expect(gateway.business).toHaveLength(1);
    expect(gateway.webhooksLlamados).toHaveLength(0);
    expect(ok).toMatchObject({ enviado: true, detalle: 'Enviado (id wamid.1)' });
    expect(ok!.whatsappManual).toBeUndefined();

    gateway.respuestaBusiness = { ok: false, detalle: 'Template not found' };
    const [fallo] = await service.ejecutar({ actor: actor(), empresaIds: ['e6'], tipo: 'versiones', canal: 'whatsapp' });
    expect(fallo!.whatsappManual?.telefono).toBe('529991234567');
    expect(fallo!.detalle).toBe('Template not found');
  });

  it('incluye la carta técnica del sistema en el mensaje de versiones', async () => {
    await versiones.save(
      new VersionSistema({
        id: 'v1',
        sistema: 'Contabilidad',
        versionActual: '19.1.0',
        linkCartaTecnica: 'https://dattasoft.mx/carta.pdf',
      }),
    );
    await empresas.save(
      new Empresa({ id: 'e9', nombre: 'Con Carta', sistemasContratados: ['Contabilidad'], versionesInstaladas: { Contabilidad: '18.0.0' } }),
    );
    await contactos.save(new Contacto({ id: 'c9', nombre: 'Cliente Nueve', empresaId: 'e9', email: 'c9@x.mx' }));

    await service.ejecutar({ actor: actor(), empresaIds: ['e9'], tipo: 'versiones' });
    expect(email.enviados[0]!.texto).toContain('Carta técnica: https://dattasoft.mx/carta.pdf');
  });

  it('usa los contactos de soporte propios del usuario si los tiene (Mi perfil)', async () => {
    const usuarios = new InMemoryUsuarioRepository([
      new Usuario({
        uid: 'ventas1',
        email: 'v@d.com',
        nombre: 'Ventas',
        rol: 'ventas',
        contactosSoporte: [{ nombre: 'Erick', telefono: '999 111 2222' }],
      }),
    ]);
    const conUsuarios = new AvisarEmpresasService(
      empresas,
      contactos,
      versiones,
      config,
      email,
      gateway,
      new BitacoraService(bitacora, ids, clock, silentLogger),
      clock,
      avisos,
      ids,
      usuarios,
    );
    const cfg = await config.obtenerAvisos();
    await config.guardarAvisos({ ...cfg, contactosSoporteVersiones: [{ nombre: 'General', telefono: '555' }] });
    await versiones.save(new VersionSistema({ id: 'v1', sistema: 'Contabilidad', versionActual: '19.1.0' }));
    await empresas.save(
      new Empresa({ id: 'e10', nombre: 'Propios', sistemasContratados: ['Contabilidad'], versionesInstaladas: { Contabilidad: '18.0.0' } }),
    );
    await contactos.save(new Contacto({ id: 'c10', nombre: 'Cliente Diez', empresaId: 'e10', email: 'c10@x.mx' }));

    await conUsuarios.ejecutar({ actor: actor(), empresaIds: ['e10'], tipo: 'versiones' });
    const texto = email.enviados[0]!.texto ?? '';
    expect(texto).toContain('Erick: 999 111 2222');
    expect(texto).not.toContain('General: 555');
  });
});

describe('AvisarEmpresasService — historial de avisos enviados', () => {
  it('registra una fila por sistema, con las versiones, el canal y quién lo mandó', async () => {
    const empresas = new InMemoryEmpresaRepository();
    const contactos = new InMemoryContactoRepository();
    const versiones = new InMemoryVersionRepository();
    const config = new InMemoryConfiguracionRepository();
    const avisos = new InMemoryAvisoRepository();
    const clock = new FixedClock(new Date('2026-09-25T12:00:00Z'));
    const service = new AvisarEmpresasService(
      empresas,
      contactos,
      versiones,
      config,
      new FakeEmailSender(),
      new FakeIntegracionesGateway(),
      new BitacoraService(new InMemoryBitacoraRepository(), ids, clock, silentLogger),
      clock,
      avisos,
      ids,
    );

    await versiones.save(new VersionSistema({ id: 'v1', sistema: 'Contabilidad', versionActual: '19.1.0' }));
    await versiones.save(new VersionSistema({ id: 'v2', sistema: 'Nóminas', versionActual: '12.0.0' }));
    await empresas.save(
      new Empresa({
        id: 'e1',
        nombre: 'Empresa Uno',
        sistemasContratados: ['Contabilidad', 'Nóminas'],
        versionesInstaladas: { Contabilidad: '18.0.0', 'Nóminas': '11.0.0' },
      }),
    );
    await contactos.save(new Contacto({ id: 'c1', nombre: 'Cliente', empresaId: 'e1', email: 'c1@x.mx' }));

    await service.ejecutar({ actor: actor(), empresaIds: ['e1'], tipo: 'versiones' });

    // Dos sistemas desactualizados => dos filas, no un solo registro de "ya le avisé".
    expect(avisos.items).toHaveLength(2);
    const conta = avisos.items.find((a) => a.sistema === 'Contabilidad')!;
    expect(conta.empresaNombre).toBe('Empresa Uno');
    expect(conta.tipo).toBe('sistema');
    expect(conta.versionInstalada).toBe('18.0.0');
    expect(conta.versionOficial).toBe('19.1.0');
    expect(conta.canal).toBe('correo');
    expect(conta.destino).toBe('c1@x.mx');
    expect(conta.enviadoPorNombre).toBeTruthy();
  });

  it('respeta la selección de sistemas: solo registra los elegidos', async () => {
    const empresas = new InMemoryEmpresaRepository();
    const contactos = new InMemoryContactoRepository();
    const versiones = new InMemoryVersionRepository();
    const avisos = new InMemoryAvisoRepository();
    const clock = new FixedClock(new Date('2026-09-25T12:00:00Z'));
    const service = new AvisarEmpresasService(
      empresas,
      contactos,
      versiones,
      new InMemoryConfiguracionRepository(),
      new FakeEmailSender(),
      new FakeIntegracionesGateway(),
      new BitacoraService(new InMemoryBitacoraRepository(), ids, clock, silentLogger),
      clock,
      avisos,
      ids,
    );

    await versiones.save(new VersionSistema({ id: 'v1', sistema: 'Contabilidad', versionActual: '19.1.0' }));
    await versiones.save(new VersionSistema({ id: 'v2', sistema: 'Nóminas', versionActual: '12.0.0' }));
    await empresas.save(
      new Empresa({
        id: 'e1',
        nombre: 'Empresa Uno',
        sistemasContratados: ['Contabilidad', 'Nóminas'],
        versionesInstaladas: { Contabilidad: '18.0.0', 'Nóminas': '11.0.0' },
      }),
    );
    await contactos.save(new Contacto({ id: 'c1', nombre: 'Cliente', empresaId: 'e1', email: 'c1@x.mx' }));

    await service.ejecutar({
      actor: actor(),
      empresaIds: ['e1'],
      tipo: 'versiones',
      seleccion: { e1: ['Nóminas'] },
    });

    expect(avisos.items.map((a) => a.sistema)).toEqual(['Nóminas']);
  });

  it('el filtro del historial cruza por empresa y por rango de fechas', async () => {
    const avisos = new InMemoryAvisoRepository();
    const base = {
      empresaId: 'e1',
      sistema: 'Contabilidad',
      tipo: 'sistema' as const,
      versionInstalada: '1',
      versionOficial: '2',
      fechaVencimiento: null,
      canal: 'correo' as const,
      destino: 'x@x.mx',
      enviadoPorUid: 'u1',
      enviadoPorNombre: 'Admin',
    };
    await avisos.registrar([
      { ...base, id: 'a1', empresaNombre: 'Alfa', createdAt: new Date('2026-09-01T10:00:00Z') },
      { ...base, id: 'a2', empresaNombre: 'Beta', createdAt: new Date('2026-09-20T10:00:00Z') },
    ]);

    expect((await avisos.list({ empresa: 'alf' })).map((a) => a.id)).toEqual(['a1']);
    expect((await avisos.list({ desde: new Date('2026-09-10T00:00:00Z') })).map((a) => a.id)).toEqual(['a2']);
    // Más reciente primero.
    expect((await avisos.list()).map((a) => a.id)).toEqual(['a2', 'a1']);
  });
});
