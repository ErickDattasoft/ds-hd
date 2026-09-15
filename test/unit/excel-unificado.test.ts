import { beforeEach, describe, expect, it } from 'vitest';
import { EmpresaService } from '../../src/application/empresas/EmpresaService.js';
import { EmpresaExcelService } from '../../src/application/empresas/EmpresaExcelService.js';
import { ContactoService } from '../../src/application/contactos/ContactoService.js';
import { ContactoExcelService } from '../../src/application/contactos/ContactoExcelService.js';
import { TicketExcelService } from '../../src/application/tickets/TicketExcelService.js';
import { ExcelUnificadoService } from '../../src/application/excel/ExcelUnificadoService.js';
import { BitacoraService } from '../../src/application/shared/BitacoraService.js';
import { Ticket } from '../../src/core/entities/Ticket.js';
import { Empresa } from '../../src/core/entities/Empresa.js';
import { ExceljsExcelIO } from '../../src/infrastructure/excel/ExceljsExcelIO.js';
import { ValidationError } from '../../src/core/errors/DomainError.js';
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
  roles: ['admin'],
  rol: 'admin',
  esTecnico: false,
  empresaId: null,
  activo: true,
  esStaff: true,
  esCliente: false,
  permisos: ['empresas:crear', 'empresas:editar', 'empresas:leer', 'contactos:crear', 'contactos:editar', 'contactos:leer', 'tickets:leer'],
  ...over,
});

describe('ExcelUnificadoService', () => {
  let empresaRepo: InMemoryEmpresaRepository;
  let contactoRepo: InMemoryContactoRepository;
  let unificado: ExcelUnificadoService;
  let clock: FixedClock;

  beforeEach(async () => {
    seq = 0;
    empresaRepo = new InMemoryEmpresaRepository();
    contactoRepo = new InMemoryContactoRepository();
    clock = new FixedClock(new Date('2026-09-15T10:00:00Z'));
    const bitacora = new BitacoraService(new InMemoryBitacoraRepository(), ids, clock, silentLogger);
    const empresaService = new EmpresaService(empresaRepo, ids, clock, bitacora);
    const contactoService = new ContactoService(contactoRepo, empresaRepo, ids, clock, bitacora);
    const excelIO = new ExceljsExcelIO();
    const empresaExcel = new EmpresaExcelService(empresaService, excelIO);
    const contactoExcel = new ContactoExcelService(contactoService, empresaService, excelIO);
    const ticketStore = new InMemoryTicketStore();
    const ticketQueries = new InMemoryTicketQueries(ticketStore);
    const ticketRepo = new InMemoryTicketRepository(ticketStore);
    const ticketExcel = new TicketExcelService(ticketQueries, excelIO);
    unificado = new ExcelUnificadoService(empresaExcel, contactoExcel, ticketExcel, excelIO);

    await empresaRepo.save(new Empresa({ id: 'e1', nombre: 'ACME SA', sistemasContratados: ['Contabilidad'] }));
    await contactoService.crear(actor(), { nombre: 'Juan Pérez', empresaId: 'e1', email: 'juan@acme.com' });
    await ticketRepo.save(
      Ticket.crear({
        id: 't1',
        numero: 1,
        asunto: 'Falla',
        descripcion: 'descripción de prueba',
        tipo: 'General',
        prioridad: 'Media',
        estadoInicial: 'Abierto',
        canal: 'interno',
        ahora: clock.now(),
      }),
    );
  });

  it('exporta las 3 hojas cuando se piden y el actor tiene permiso para las 3', async () => {
    const buffer = await unificado.exportar(actor(), { empresas: true, contactos: true, tickets: true });
    const hojas = await new ExceljsExcelIO().leerVarias(buffer);
    expect(Object.keys(hojas)).toEqual(['Empresas', 'Contactos', 'Tickets']);
    expect(hojas.Empresas).toEqual([expect.objectContaining({ Nombre: 'ACME SA' })]);
    expect(hojas.Contactos).toEqual([expect.objectContaining({ Nombre: 'Juan Pérez', Empresa: 'ACME SA' })]);
    expect(hojas.Tickets).toEqual([expect.objectContaining({ Asunto: 'Falla' })]);
  });

  it('solo incluye las hojas marcadas', async () => {
    const buffer = await unificado.exportar(actor(), { empresas: true, contactos: false, tickets: false });
    const hojas = await new ExceljsExcelIO().leerVarias(buffer);
    expect(Object.keys(hojas)).toEqual(['Empresas']);
  });

  it('omite una hoja si el actor no tiene permiso de leerla, aunque la haya marcado', async () => {
    const buffer = await unificado.exportar(actor({ permisos: ['empresas:leer'] }), {
      empresas: true,
      contactos: true,
      tickets: true,
    });
    const hojas = await new ExceljsExcelIO().leerVarias(buffer);
    expect(Object.keys(hojas)).toEqual(['Empresas']);
  });

  it('sin nada seleccionado (o sin permiso de nada), lanza ValidationError', async () => {
    await expect(unificado.exportar(actor(), { empresas: false, contactos: false, tickets: false })).rejects.toThrow(
      ValidationError,
    );
  });

  it('importa un archivo unificado: crea empresas y contactos, ignora la hoja Tickets', async () => {
    const nuevoBuffer = await new ExceljsExcelIO().escribirVarias([
      {
        nombre: 'Empresas',
        columnas: [{ header: 'Nombre', key: 'nombre' }],
        filas: [{ nombre: 'Nueva Empresa SA' }],
      },
      {
        nombre: 'Contactos',
        columnas: [
          { header: 'Nombre', key: 'nombre' },
          { header: 'Empresa', key: 'empresa' },
        ],
        filas: [{ nombre: 'Laura', empresa: 'Nueva Empresa SA' }],
      },
      { nombre: 'Tickets', columnas: [{ header: 'Folio', key: 'folio' }], filas: [{ folio: '999' }] },
    ]);

    const resumen = await unificado.importar(actor(), nuevoBuffer);
    expect(resumen.empresas).toMatchObject({ creadas: 1 });
    expect(resumen.contactos).toMatchObject({ creadas: 1 });
    expect([...empresaRepo.items.values()].some((e) => e.nombre === 'Nueva Empresa SA')).toBe(true);
  });

  it('sin permiso de escribir contactos, esa hoja se omite pero empresas sí se procesa', async () => {
    const buffer = await new ExceljsExcelIO().escribirVarias([
      { nombre: 'Empresas', columnas: [{ header: 'Nombre', key: 'nombre' }], filas: [{ nombre: 'Solo Empresa' }] },
      {
        nombre: 'Contactos',
        columnas: [{ header: 'Nombre', key: 'nombre' }, { header: 'Empresa', key: 'empresa' }],
        filas: [{ nombre: 'X', empresa: 'Solo Empresa' }],
      },
    ]);
    const resumen = await unificado.importar(actor({ permisos: ['empresas:crear'] }), buffer);
    expect(resumen.empresas).toMatchObject({ creadas: 1 });
    expect(resumen.contactos).toBeUndefined();
  });

  it('un archivo sin hojas reconocibles lanza ValidationError', async () => {
    const buffer = await new ExceljsExcelIO().escribirVarias([
      { nombre: 'Otra cosa', columnas: [{ header: 'X', key: 'x' }], filas: [] },
    ]);
    await expect(unificado.importar(actor(), buffer)).rejects.toThrow(ValidationError);
  });
});
