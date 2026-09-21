import { beforeEach, describe, expect, it } from 'vitest';
import { EmpresaService } from '../../src/application/empresas/EmpresaService.js';
import { EmpresaExcelService } from '../../src/application/empresas/EmpresaExcelService.js';
import { ContactoService } from '../../src/application/contactos/ContactoService.js';
import { ContactoExcelService } from '../../src/application/contactos/ContactoExcelService.js';
import { BitacoraService } from '../../src/application/shared/BitacoraService.js';
import { ExceljsExcelIO } from '../../src/infrastructure/excel/ExceljsExcelIO.js';
import type { SessionUser } from '../../src/application/shared/SessionUser.js';
import { InMemoryEmpresaRepository, InMemoryContactoRepository, InMemoryBitacoraRepository } from '../fakes/crm.js';
import { FixedClock, silentLogger } from '../fakes/support.js';

let seq = 0;
const ids = { newId: () => `id-${++seq}`, newToken: () => `tok-${++seq}` };
const actor = {
  uid: 'admin1', nombre: 'Admin', email: 'a@d.com', roles: ['admin'], rol: 'admin', esTecnico: false,
  empresaId: null, activo: true, esStaff: true, esCliente: false,
  permisos: ['empresas:crear', 'empresas:editar', 'contactos:crear', 'contactos:editar'],
} as unknown as SessionUser;
const io = new ExceljsExcelIO();
/** Arma un .xlsx con exactamente estas columnas. */
const xlsx = (filas: Record<string, string>[]) =>
  io.escribir('Hoja', Object.keys(filas[0]!).map((h) => ({ header: h, key: h })), filas);

describe('Excel con principal/alternativo', () => {
  let empresas: EmpresaService;
  let contactos: ContactoService;
  let excelEmp: EmpresaExcelService;
  let excelCon: ContactoExcelService;

  beforeEach(() => {
    seq = 0;
    const clock = new FixedClock(new Date());
    const bitacora = new BitacoraService(new InMemoryBitacoraRepository(), ids, clock, silentLogger);
    const empresaRepo = new InMemoryEmpresaRepository();
    empresas = new EmpresaService(empresaRepo, ids, clock, bitacora);
    contactos = new ContactoService(new InMemoryContactoRepository(), empresaRepo, ids, clock, bitacora);
    excelEmp = new EmpresaExcelService(empresas, io);
    excelCon = new ContactoExcelService(contactos, empresas, io);
  });

  it('lee el Excel del CRM viejo: Teléfono 1/2, Correo 2 y varios correos en una celda', async () => {
    const r = await excelEmp.importar(actor, await xlsx([
      { Empresa: 'ACME', Correo: 'a@acme.mx, b@acme.mx', 'Correo 2': 'c@acme.mx', 'Teléfono 1': '111', 'Teléfono 2': '222' },
    ]));
    expect(r.errores).toEqual([]);
    const e = (await empresas.listar())[0]!;
    expect([e.email, e.emailAlternativo, e.telefono, e.telefonoAlternativo]).toEqual(['a@acme.mx', 'b@acme.mx', '111', '222']);
    expect(e.notas).toContain('c@acme.mx');
  });

  it('actualizar desde un Excel con menos columnas no borra lo que el archivo no trae', async () => {
    const e = await empresas.crear(actor, {
      nombre: 'ACME', sistemasContratados: ['Nóminas'], vigencias: { 'Nóminas': '2027-01-01' },
      notas: 'importante', telefonoAlternativo: '999',
    });
    await excelEmp.importar(actor, await xlsx([{ Nombre: 'ACME', RFC: 'XAXX010101000' }]));
    const d = await empresas.obtener(e.id);
    expect(d.rfc).toBe('XAXX010101000');
    expect(d.vigencias).toEqual({ 'Nóminas': '2027-01-01' });
    expect(d.notas).toBe('importante');
    expect(d.telefonoAlternativo).toBe('999');
  });

  it('contactos: varios correos, teléfono alternativo y rol en la empresa, ida y vuelta', async () => {
    const e = await empresas.crear(actor, { nombre: 'ACME' });
    const r = await excelCon.importar(actor, await xlsx([
      { Nombre: 'Ana', Empresa: 'ACME', Correo: 'ana@acme.mx; ana@gmail.com, ana3@x.mx', 'Teléfono 1': '1', 'Teléfono 2': '2', 'Rol en la empresa': 'Principal' },
      { Nombre: 'Beto', Empresa: 'ACME', Correo: 'beto@acme.mx', 'Teléfono 1': '', 'Teléfono 2': '', 'Rol en la empresa': 'Alternativo' },
    ]));
    expect(r.errores).toEqual([]);
    const [ana, beto] = await contactos.listar();
    expect([ana!.email, ana!.emailAlternativo, ana!.telefono, ana!.celular]).toEqual(['ana@acme.mx', 'ana@gmail.com', '1', '2']);
    expect(ana!.notas).toContain('ana3@x.mx');
    const d = await empresas.obtener(e.id);
    expect(d.contactoPrincipalId).toBe(ana!.id);
    expect(d.contactoAlternativoId).toBe(beto!.id);

    // Exportar y volver a importar deja todo igual (no duplica ni pierde).
    const r2 = await excelCon.importar(actor, await excelCon.exportar());
    expect(r2).toMatchObject({ creadas: 0, actualizadas: 2, errores: [] });
    const ana2 = (await contactos.listar()).find((c) => c.nombre === 'Ana')!;
    expect(ana2.emailAlternativo).toBe('ana@gmail.com');
    expect(ana2.notas).toBe(ana!.notas);
    expect((await empresas.obtener(e.id)).contactoAlternativoId).toBe(beto!.id);
  });
});
