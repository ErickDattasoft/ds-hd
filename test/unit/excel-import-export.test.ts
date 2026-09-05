import { beforeEach, describe, expect, it } from 'vitest';
import { EmpresaService } from '../../src/application/empresas/EmpresaService.js';
import { EmpresaExcelService } from '../../src/application/empresas/EmpresaExcelService.js';
import { ContactoService } from '../../src/application/contactos/ContactoService.js';
import { ContactoExcelService } from '../../src/application/contactos/ContactoExcelService.js';
import { TicketExcelService } from '../../src/application/tickets/TicketExcelService.js';
import { BitacoraService } from '../../src/application/shared/BitacoraService.js';
import { Ticket } from '../../src/core/entities/Ticket.js';
import { ExceljsExcelIO } from '../../src/infrastructure/excel/ExceljsExcelIO.js';
import type { SessionUser } from '../../src/application/shared/SessionUser.js';
import { InMemoryEmpresaRepository, InMemoryContactoRepository, InMemoryBitacoraRepository } from '../fakes/crm.js';
import { InMemoryTicketStore, InMemoryTicketQueries, InMemoryTicketRepository } from '../fakes/tickets.js';
import { FixedClock, silentLogger } from '../fakes/support.js';

let seq = 0;
const ids = { newId: () => `id-${++seq}`, newToken: () => `tok-${++seq}` };

const actor = (over: Partial<SessionUser> = {}): SessionUser => ({
  uid: 'admin1',
  nombre: 'Admin',
  email: 'a@d.com',
  rol: 'admin',
  empresaId: null,
  activo: true,
  esStaff: true,
  esCliente: false,
  permisos: ['empresas:crear', 'empresas:editar', 'contactos:crear', 'contactos:editar'],
  ...over,
});

describe('EmpresaExcelService', () => {
  let empresaRepo: InMemoryEmpresaRepository;
  let empresaService: EmpresaService;
  let excel: EmpresaExcelService;

  beforeEach(() => {
    seq = 0;
    empresaRepo = new InMemoryEmpresaRepository();
    const bitacora = new BitacoraService(new InMemoryBitacoraRepository(), ids, new FixedClock(new Date()), silentLogger);
    empresaService = new EmpresaService(empresaRepo, ids, new FixedClock(new Date()), bitacora);
    excel = new EmpresaExcelService(empresaService, new ExceljsExcelIO());
  });

  it('exporta e importa de vuelta: crea las que no existen', async () => {
    await empresaService.crear(actor(), { nombre: 'Empresa Uno', rfc: 'ABC010101XXX', sistemasContratados: ['Contabilidad'] });
    const buffer = await excel.exportar();

    const empresaRepo2 = new InMemoryEmpresaRepository();
    const bitacora2 = new BitacoraService(new InMemoryBitacoraRepository(), ids, new FixedClock(new Date()), silentLogger);
    const empresaService2 = new EmpresaService(empresaRepo2, ids, new FixedClock(new Date()), bitacora2);
    const excel2 = new EmpresaExcelService(empresaService2, new ExceljsExcelIO());

    const resumen = await excel2.importar(actor(), buffer);
    expect(resumen).toMatchObject({ total: 1, creadas: 1, actualizadas: 0, errores: [] });
    const lista = await empresaService2.listar();
    expect(lista).toHaveLength(1);
    expect(lista[0]!.nombre).toBe('Empresa Uno');
    expect(lista[0]!.rfc).toBe('ABC010101XXX');
    expect(lista[0]!.sistemasContratados).toEqual(['Contabilidad']);
  });

  it('una segunda importación con el mismo nombre actualiza en vez de duplicar', async () => {
    await empresaService.crear(actor(), { nombre: 'Empresa Dos', telefono: '111' });
    const buffer1 = await excel.exportar();
    await excel.importar(actor(), buffer1); // idéntico -> debería actualizar, no duplicar

    const lista = await empresaService.listar();
    expect(lista).toHaveLength(1);
  });

  it('reporta un error por fila sin nombre, sin abortar el resto', async () => {
    const io = new ExceljsExcelIO();
    const buffer = await io.escribir(
      'Empresas',
      [{ header: 'Nombre', key: 'nombre' }, { header: 'RFC', key: 'rfc' }],
      [{ nombre: '', rfc: 'X' }, { nombre: 'Empresa Tres', rfc: '' }],
    );
    const resumen = await excel.importar(actor(), buffer);
    expect(resumen.total).toBe(2);
    expect(resumen.creadas).toBe(1);
    expect(resumen.errores).toHaveLength(1);
    expect(resumen.errores[0]).toContain('Fila 2');
  });
});

describe('ContactoExcelService', () => {
  let empresaRepo: InMemoryEmpresaRepository;
  let empresaService: EmpresaService;
  let contactoService: ContactoService;
  let excel: ContactoExcelService;

  beforeEach(() => {
    seq = 0;
    const clock = new FixedClock(new Date());
    empresaRepo = new InMemoryEmpresaRepository();
    const bitacora = new BitacoraService(new InMemoryBitacoraRepository(), ids, clock, silentLogger);
    empresaService = new EmpresaService(empresaRepo, ids, clock, bitacora);
    contactoService = new ContactoService(new InMemoryContactoRepository(), empresaRepo, ids, clock, bitacora);
    excel = new ContactoExcelService(contactoService, empresaService, new ExceljsExcelIO());
  });

  it('exporta con el nombre de la empresa y reimporta emparejando por nombre de empresa', async () => {
    const empresa = await empresaService.crear(actor(), { nombre: 'Empresa Contactos' });
    await contactoService.crear(actor(), { nombre: 'Juan Pérez', empresaId: empresa.id, email: 'juan@ejemplo.com' });

    const buffer = await excel.exportar();

    const empresaRepo2 = new InMemoryEmpresaRepository();
    const clock2 = new FixedClock(new Date());
    const bitacora2 = new BitacoraService(new InMemoryBitacoraRepository(), ids, clock2, silentLogger);
    const empresaService2 = new EmpresaService(empresaRepo2, ids, clock2, bitacora2);
    await empresaService2.crear(actor(), { nombre: 'Empresa Contactos' });
    const contactoService2 = new ContactoService(new InMemoryContactoRepository(), empresaRepo2, ids, clock2, bitacora2);
    const excel2 = new ContactoExcelService(contactoService2, empresaService2, new ExceljsExcelIO());

    const resumen = await excel2.importar(actor(), buffer);
    expect(resumen).toMatchObject({ total: 1, creadas: 1, errores: [] });
    const lista = await contactoService2.listar();
    expect(lista[0]!.nombre).toBe('Juan Pérez');
    expect(lista[0]!.email).toBe('juan@ejemplo.com');
  });

  it('reporta error si la empresa referenciada no existe', async () => {
    const io = new ExceljsExcelIO();
    const buffer = await io.escribir(
      'Contactos',
      [{ header: 'Nombre', key: 'nombre' }, { header: 'Empresa', key: 'empresa' }],
      [{ nombre: 'Alguien', empresa: 'No Existe SA' }],
    );
    const resumen = await excel.importar(actor(), buffer);
    expect(resumen.creadas).toBe(0);
    expect(resumen.errores).toHaveLength(1);
    expect(resumen.errores[0]).toContain('No Existe SA');
  });
});

describe('TicketExcelService', () => {
  it('exporta los tickets filtrados a un .xlsx con encabezados', async () => {
    const store = new InMemoryTicketStore();
    const repo = new InMemoryTicketRepository(store);
    const queries = new InMemoryTicketQueries(store);
    await repo.save(
      Ticket.crear({
        id: 't1',
        numero: 900,
        asunto: 'Excel export',
        descripcion: 'descripción de prueba',
        tipo: 'General',
        prioridad: 'Alta',
        estadoInicial: 'Abierto',
        canal: 'interno',
        ahora: new Date('2026-01-01T00:00:00Z'),
      }),
    );
    const service = new TicketExcelService(queries, new ExceljsExcelIO());
    const buffer = await service.exportar({ archivado: false });

    const io = new ExceljsExcelIO();
    const filas = await io.leer(buffer);
    expect(filas).toHaveLength(1);
    expect(filas[0]).toMatchObject({ Número: '900', Asunto: 'Excel export', Estado: 'Abierto', Prioridad: 'Alta' });
  });
});
