import { describe, expect, it } from 'vitest';
import { CumpleanosService } from '../../src/application/dashboard/CumpleanosService.js';
import type { SessionUser } from '../../src/application/shared/SessionUser.js';
import { Contacto } from '../../src/core/entities/Contacto.js';
import { Empresa } from '../../src/core/entities/Empresa.js';
import { ValidationError } from '../../src/core/errors/DomainError.js';
import { mesDiaDe, normalizarFechaISO, proximosDias } from '../../src/core/entities/value-objects/fechasEspeciales.js';
import { InMemoryContactoRepository, InMemoryEmpresaRepository } from '../fakes/crm.js';
import { FixedClock } from '../fakes/support.js';

const actor = { uid: 'u', nombre: 'U', permisos: ['contactos:leer', 'empresas:leer'] } as unknown as SessionUser;

describe('fechas especiales', () => {
  it('arma y valida el mes-día del cumpleaños', () => {
    expect(mesDiaDe('3', '11')).toBe('11-03');
    expect(mesDiaDe('', '')).toBeNull();
    expect(() => mesDiaDe('31', '2')).toThrow(ValidationError);
    expect(() => mesDiaDe('5', '')).toThrow(ValidationError);
    expect(normalizarFechaISO('2006-02-30')).toBeNull();
    expect(normalizarFechaISO('2006-05-15')).toBe('2006-05-15');
  });

  it('cruza fin de año y festeja el 29 de febrero el 28 en años no bisiestos', () => {
    const fin = proximosDias('2026-12-30', 3).map((d) => d.mesDia);
    expect(fin).toEqual(['12-30', '12-31', '01-01', '01-02']);
    const feb = proximosDias('2027-02-27', 2).map((d) => `${d.mesDia}:${d.dias}`);
    expect(feb).toEqual(['02-27:0', '02-28:1', '02-29:1', '03-01:2']);
  });
});

describe('CumpleanosService', () => {
  it('lista cumpleaños y aniversarios de la semana, ordenados, con su mensaje', async () => {
    const empresas = new InMemoryEmpresaRepository([
      new Empresa({ id: 'e1', nombre: 'ACME', fechaFundacion: '2016-11-05', telefono: '999 123 4567' }),
      new Empresa({ id: 'e2', nombre: 'LEJANA', fechaFundacion: '2010-12-25' }),
    ]);
    const contactos = new InMemoryContactoRepository();
    await contactos.save(new Contacto({ id: 'c1', nombre: 'Ana López', empresaId: 'e1', cumpleanos: '11-03', email: 'ana@acme.mx' }));
    await contactos.save(new Contacto({ id: 'c2', nombre: 'Beto', empresaId: 'e1', cumpleanos: '11-20' }));
    // 3-nov-2026 a mediodía en México.
    const service = new CumpleanosService(contactos, empresas, new FixedClock(new Date('2026-11-03T18:00:00Z')));

    const lista = await service.proximos(actor);
    expect(lista.map((f) => [f.tipo, f.nombre, f.dias])).toEqual([
      ['cumpleanos', 'Ana López', 0],
      ['aniversario', 'ACME', 2],
    ]);
    expect(lista[0]!.detalle).toBe('ACME');
    expect(lista[0]!.mensaje).toContain('Feliz cumpleaños, Ana');
    expect(lista[1]!.anios).toBe(10);
    expect(lista[1]!.whatsapp).toBe('529991234567');
  });

  it('sin permisos de contactos ni empresas no consulta nada', async () => {
    const service = new CumpleanosService(new InMemoryContactoRepository(), new InMemoryEmpresaRepository(), new FixedClock(new Date()));
    expect(await service.proximos({ ...actor, permisos: [] } as SessionUser)).toEqual([]);
  });
});
