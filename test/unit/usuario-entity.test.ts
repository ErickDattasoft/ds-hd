import { describe, expect, it } from 'vitest';
import { Usuario } from '../../src/core/entities/Usuario.js';
import { UsuarioMapper } from '../../src/infrastructure/firestore/mappers/UsuarioMapper.js';
import { ValidationError } from '../../src/core/errors/DomainError.js';

const base = { uid: 'u1', email: 'a@b.com', nombre: 'Ana' };

describe('Usuario — multi-rol', () => {
  it('rolPrincipal es el de mayor alcance según el orden de ROLES', () => {
    const u = new Usuario({ ...base, roles: ['ventas', 'admin', 'soporte'] });
    expect(u.rolPrincipal).toBe('admin');
    expect(u.rol).toBe('admin'); // getter de compatibilidad
  });

  it('esStaff / esCliente / esTecnico salen del conjunto', () => {
    const staff = new Usuario({ ...base, roles: ['ventas', 'soporte'] });
    expect(staff.esStaff).toBe(true);
    expect(staff.esCliente).toBe(false);
    expect(staff.esTecnico).toBe(true); // soporte es técnico

    const soloVentas = new Usuario({ ...base, roles: ['ventas'] });
    expect(soloVentas.esTecnico).toBe(false);

    const cli = new Usuario({ ...base, roles: ['cliente'], empresaId: 'e1' });
    expect(cli.esCliente).toBe(true);
    expect(cli.esStaff).toBe(false);
  });

  it('rechaza combinar cliente con roles de personal', () => {
    expect(() => new Usuario({ ...base, roles: ['cliente', 'soporte'] })).toThrow(ValidationError);
  });

  it('rechaza un conjunto de roles vacío', () => {
    expect(() => new Usuario({ ...base, roles: [] })).toThrow(ValidationError);
  });

  it('deduplica y normaliza el orden', () => {
    const u = new Usuario({ ...base, roles: ['ventas', 'soporte', 'ventas'] });
    expect(u.roles).toEqual(['soporte', 'ventas']);
  });

  it('cambiarRoles valida la coherencia', () => {
    const u = new Usuario({ ...base, roles: ['soporte'] });
    u.cambiarRoles(['soporte', 'ventas'], new Date());
    expect(u.roles).toEqual(['soporte', 'ventas']);
    expect(() => u.cambiarRoles(['cliente', 'ventas'], new Date())).toThrow(ValidationError);
  });

  it('acepta la forma legacy de un solo rol (prop `rol`)', () => {
    const u = new Usuario({ ...base, rol: 'agente' });
    expect(u.roles).toEqual(['agente']);
  });
});

describe('UsuarioMapper', () => {
  it('lee documentos viejos con solo `rol` como [rol]', () => {
    const u = UsuarioMapper.toDomain('u1', { email: 'a@b.com', nombre: 'Ana', rol: 'soporte' });
    expect(u.roles).toEqual(['soporte']);
  });

  it('lee documentos nuevos con `roles: string[]`', () => {
    const u = UsuarioMapper.toDomain('u1', {
      email: 'a@b.com',
      nombre: 'Ana',
      roles: ['ventas', 'soporte'],
      rol: 'soporte',
    });
    expect(u.roles).toEqual(['soporte', 'ventas']);
  });

  it('escribe solo `roles` (ordenados por alcance), sin el `rol` legacy', () => {
    const u = new Usuario({ ...base, roles: ['ventas', 'admin'] });
    const doc = UsuarioMapper.toDocument(u);
    expect(doc.roles).toEqual(['admin', 'ventas']);
    expect(doc.rol).toBeUndefined();
  });
});
