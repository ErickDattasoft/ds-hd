import { describe, expect, it } from 'vitest';
import { crearImportadores } from '../../src/application/migracion/importadores.js';
import type { Container } from '../../src/config/container.js';
import { InMemoryContactoRepository, InMemoryEmpresaRepository } from '../fakes/crm.js';

function montar() {
  const empresaRepo = new InMemoryEmpresaRepository();
  const contactoRepo = new InMemoryContactoRepository();
  const c = { resolve: (n: string) => ({ empresaRepo, contactoRepo })[n as 'empresaRepo'] } as unknown as Container;
  const imp = crearImportadores({ dryRun: false, log: () => {} });
  return { empresaRepo, contactoRepo, c, imp };
}

const respaldo = {
  clientes: [
    {
      EMPRESA: 'ACME',
      CONTACTO: 'Ana',
      CORREO: 'ana@acme.mx, pagos@acme.mx, otro@acme.mx',
      TELEFONO_1: '999 111',
      TELEFONO_2: '999 222',
      CONTACTO_2: 'Beto',
      CORREO_2: 'beto@acme.mx',
      SISTEMAS: {},
    },
  ],
  contactos: [{ empresa: 'ACME', nombre: 'Ana', correo: 'ana@acme.mx; ana.personal@gmail.com', telefono1: '1', telefono2: '2' }],
};

describe('migración: principal y alternativo del CRM viejo', () => {
  it('conserva teléfono y correo alternativos de la empresa, y los correos de más en notas', async () => {
    const { empresaRepo, c, imp } = montar();
    await imp.importarEmpresas(c, respaldo);
    const e = (await empresaRepo.list())[0]!;
    expect(e.telefono).toBe('999 111');
    expect(e.telefonoAlternativo).toBe('999 222');
    expect(e.email).toBe('ana@acme.mx');
    expect(e.emailAlternativo).toBe('pagos@acme.mx');
    expect(e.notas).toContain('otro@acme.mx');
    expect(e.notas).toContain('beto@acme.mx');
  });

  it('crea al alternativo que no estaba en la lista y marca principal/alternativo en la empresa', async () => {
    const { empresaRepo, contactoRepo, c, imp } = montar();
    await imp.importarEmpresas(c, respaldo);
    await imp.importarContactos(c, respaldo);
    const contactos = await contactoRepo.list();
    const ana = contactos.find((x) => x.nombre === 'Ana')!;
    const beto = contactos.find((x) => x.nombre === 'Beto')!;
    expect(contactos).toHaveLength(2);
    expect(ana.email).toBe('ana@acme.mx');
    expect(ana.emailAlternativo).toBe('ana.personal@gmail.com');
    expect(beto.email).toBe('beto@acme.mx');
    const e = (await empresaRepo.list())[0]!;
    expect(e.contactoPrincipalId).toBe(ana.id);
    expect(e.contactoAlternativoId).toBe(beto.id);

    // Reimportar empresas no borra lo marcado.
    await imp.importarEmpresas(c, respaldo);
    expect((await empresaRepo.list())[0]!.contactoPrincipalId).toBe(ana.id);
  });

  it('avisa lo que está en ds-hd y ya no viene en el respaldo, sin borrarlo', async () => {
    const { empresaRepo, contactoRepo, c, imp } = montar();
    await imp.importarEmpresas(c, respaldo);
    await imp.importarContactos(c, respaldo);
    const sinBeto = {
      clientes: [{ ...respaldo.clientes[0]!, CONTACTO_2: '', CORREO_2: '' }, { EMPRESA: 'NUEVA', SISTEMAS: {} }],
      contactos: respaldo.contactos,
    };
    const otro = { clientes: [sinBeto.clientes[1]!], contactos: [] };
    const e = await imp.importarEmpresas(c, otro);
    expect(e.sobrantes).toEqual(['ACME']);
    const r = await imp.importarContactos(c, sinBeto);
    expect(r.sobrantes).toEqual(['Beto (ACME)']);
    expect(await empresaRepo.list()).toHaveLength(2);
    expect(await contactoRepo.list()).toHaveLength(2);
  });
});
