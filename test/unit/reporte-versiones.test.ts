import { beforeEach, describe, expect, it } from 'vitest';
import { ReporteVersionesService } from '../../src/application/versiones/ReporteVersionesService.js';
import { BitacoraService } from '../../src/application/shared/BitacoraService.js';
import { Empresa } from '../../src/core/entities/Empresa.js';
import { Contacto } from '../../src/core/entities/Contacto.js';
import { VersionSistema } from '../../src/core/entities/VersionSistema.js';
import { ValidationError } from '../../src/core/errors/DomainError.js';
import type { SessionUser } from '../../src/application/shared/SessionUser.js';
import { InMemoryEmpresaRepository, InMemoryContactoRepository, InMemoryBitacoraRepository } from '../fakes/crm.js';
import { InMemoryVersionRepository } from '../fakes/kb.js';
import { FflateExcelIO } from '../../src/infrastructure/excel/FflateExcelIO.js';
import { FakeEmailSender } from '../fakes/FakeEmailSender.js';
import { FixedClock, silentLogger } from '../fakes/support.js';

let seq = 0;
const ids = { newId: () => `id-${++seq}`, newToken: () => `tok-${++seq}` };

const actor = (over: Partial<SessionUser> = {}): SessionUser => ({
  uid: 'u1',
  nombre: 'Admin',
  email: 'a@d.com',
  roles: ['admin'],
  rol: 'admin',
  esTecnico: false,
  empresaId: null,
  activo: true,
  esStaff: true,
  esCliente: false,
  permisos: ['versiones:editar'],
  ...over,
});

describe('ReporteVersionesService', () => {
  let empresas: InMemoryEmpresaRepository;
  let contactos: InMemoryContactoRepository;
  let versiones: InMemoryVersionRepository;
  let email: FakeEmailSender;
  let bitacora: InMemoryBitacoraRepository;
  let clock: FixedClock;
  let service: ReporteVersionesService;

  beforeEach(async () => {
    seq = 0;
    empresas = new InMemoryEmpresaRepository();
    contactos = new InMemoryContactoRepository();
    versiones = new InMemoryVersionRepository();
    email = new FakeEmailSender();
    bitacora = new InMemoryBitacoraRepository();
    clock = new FixedClock(new Date('2026-09-01T12:00:00Z'));
    service = new ReporteVersionesService(
      empresas,
      contactos,
      versiones,
      new FflateExcelIO(),
      email,
      new BitacoraService(bitacora, ids, clock, silentLogger),
      clock,
    );

    await versiones.save(
      new VersionSistema({ id: 'v1', sistema: 'Contabilidad', versionActual: '19.1.0', linkCartaTecnica: 'https://ct/cont' }),
    );
    await empresas.save(
      new Empresa({
        id: 'e1',
        nombre: 'Empresa Uno',
        rfc: 'EUN010101AA1',
        sistemasContratados: ['Contabilidad'],
        versionesInstaladas: { Contabilidad: '18.0.0' },
        vigencias: { Contabilidad: '2026-08-01' }, // vencida
      }),
    );
    await contactos.save(new Contacto({ id: 'c1', nombre: 'Ana', empresaId: 'e1', email: 'ana@uno.com', celular: '5550001' }));
    await empresas.save(
      new Empresa({
        id: 'e2',
        nombre: 'Empresa Al Día',
        sistemasContratados: ['Contabilidad'],
        versionesInstaladas: { Contabilidad: '19.1.0' },
      }),
    );
  });

  it('lista solo empresas con sistemas o licencias desactualizadas, con carta técnica', async () => {
    const filas = await service.generar();
    expect(filas).toHaveLength(1);
    expect(filas[0]!.empresa).toBe('Empresa Uno');
    expect(filas[0]!.rfc).toBe('EUN010101AA1');
    expect(filas[0]!.correo).toBe('ana@uno.com');
    expect(filas[0]!.sistemasDesactualizados[0]).toMatchObject({
      sistema: 'Contabilidad',
      instalada: '18.0.0',
      oficial: '19.1.0',
      cartaTecnica: 'https://ct/cont',
    });
    expect(filas[0]!.licencias[0]!.estado).toBe('vencida');
  });

  it('filtra por empresa', async () => {
    expect(await service.generar({ empresaId: 'e2' })).toHaveLength(0);
    expect(await service.generar({ empresaId: 'e1' })).toHaveLength(1);
  });

  it('exporta a xlsx (buffer no vacío)', async () => {
    const buf = await service.exportarExcel();
    expect(buf.length).toBeGreaterThan(0);
  });

  it('envía por correo a los destinatarios y registra en bitácora', async () => {
    const { enviadoA } = await service.enviarPorCorreo(actor(), { destinatarios: ['jefe@d.com', ' JEFE@d.com '] });
    expect(enviadoA).toEqual(['jefe@d.com']);
    expect(email.enviados).toHaveLength(1);
    expect(email.enviados[0]!.html).toContain('Empresa Uno');
    expect(bitacora.entradas).toHaveLength(1);
  });

  it('rechaza el envío sin destinatarios', async () => {
    await expect(service.enviarPorCorreo(actor(), { destinatarios: ['  '] })).rejects.toThrow(ValidationError);
  });
});
