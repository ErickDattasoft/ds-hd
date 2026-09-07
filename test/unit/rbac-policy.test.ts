import { describe, expect, it } from 'vitest';
import { Usuario } from '../../src/core/entities/Usuario.js';
import { ROLES } from '../../src/core/entities/value-objects/Rol.js';
import { ROLE_PERMISSIONS } from '../../src/interfaces/http/rbac/roles.js';
import { PERMISOS, esPermiso } from '../../src/interfaces/http/rbac/permissions.js';
import { can, permisosEfectivos } from '../../src/interfaces/http/rbac/policy.js';
import type { SessionUser } from '../../src/application/shared/SessionUser.js';

const sessionUser = (rol: SessionUser['rol'], permisos: string[], extra: Partial<SessionUser> = {}): SessionUser => ({
  uid: 'u1',
  nombre: 'Test',
  email: 't@t.com',
  roles: [rol],
  rol,
  empresaId: null,
  activo: true,
  esStaff: rol !== 'cliente',
  esCliente: rol === 'cliente',
  esTecnico: rol === 'agente' || rol === 'soporte',
  permisos,
  ...extra,
});

describe('catálogo de permisos y roles', () => {
  it('cada rol solo referencia permisos del catálogo', () => {
    for (const rol of ROLES) {
      for (const p of ROLE_PERMISSIONS[rol]) {
        expect(esPermiso(p), `${rol} → ${p}`).toBe(true);
      }
    }
  });

  it('admin tiene todos los permisos', () => {
    expect(new Set(ROLE_PERMISSIONS.admin)).toEqual(new Set(PERMISOS));
  });

  it('supervisor no gestiona integraciones ni roles', () => {
    expect(ROLE_PERMISSIONS.supervisor).not.toContain('configuracion:integraciones');
    expect(ROLE_PERMISSIONS.supervisor).not.toContain('roles:gestionar');
  });

  it('cliente solo tiene permisos de portal', () => {
    expect([...ROLE_PERMISSIONS.cliente]).toEqual(['portal:tickets', 'portal:perfil']);
  });

  it('soporte trabaja tickets pero no ve nada comercial', () => {
    const soporte = new Set(ROLE_PERMISSIONS.soporte);
    expect(soporte.has('tickets:leer')).toBe(true);
    expect(soporte.has('tickets:asignar')).toBe(true);
    expect(soporte.has('cotizaciones:leer')).toBe(false);
    expect(soporte.has('seguimiento:gestionar')).toBe(false);
    expect(soporte.has('empresas:crear')).toBe(false);
  });

  it('ventas gestiona lo comercial pero no la cola de soporte', () => {
    const ventas = new Set(ROLE_PERMISSIONS.ventas);
    expect(ventas.has('cotizaciones:crear')).toBe(true);
    expect(ventas.has('empresas:editar')).toBe(true);
    expect(ventas.has('seguimiento:gestionar')).toBe(true);
    expect(ventas.has('tickets:leer')).toBe(false);
    expect(ventas.has('tickets:crear')).toBe(false);
  });
});

describe('permisosEfectivos', () => {
  it('aplica extras y revocados sobre el rol', () => {
    const u = new Usuario({
      uid: 'x',
      email: 'a@b.com',
      nombre: 'Ana',
      rol: 'agente',
      permisosExtra: ['bitacora:leer'],
      permisosRevocados: ['kb:escribir'],
    });
    const efectivos = permisosEfectivos(u);
    expect(efectivos).toContain('bitacora:leer');
    expect(efectivos).not.toContain('kb:escribir');
    expect(efectivos).toContain('tickets:leer');
  });

  it('con varios roles, une los permisos de todos', () => {
    const u = new Usuario({
      uid: 'x',
      email: 'a@b.com',
      nombre: 'Multi',
      roles: ['soporte', 'ventas'],
    });
    const efectivos = new Set(permisosEfectivos(u));
    expect(efectivos.has('tickets:asignar')).toBe(true); // de soporte
    expect(efectivos.has('cotizaciones:crear')).toBe(true); // de ventas
    expect(u.rolPrincipal).toBe('soporte'); // mayor alcance según ROLES
  });

  it('ignora cadenas fuera del catálogo en permisosExtra', () => {
    const u = new Usuario({
      uid: 'x',
      email: 'a@b.com',
      nombre: 'Ana',
      rol: 'lectura',
      permisosExtra: ['inventado:cosa'],
    });
    expect(permisosEfectivos(u)).not.toContain('inventado:cosa');
  });
});

describe('can()', () => {
  it('niega si el usuario está inactivo', () => {
    const u = sessionUser('admin', [...PERMISOS], { activo: false });
    expect(can(u, 'dashboard:ver')).toBe(false);
  });

  it('un agente sin tickets:leer_todos solo edita los suyos', () => {
    const agente = sessionUser('agente', ['tickets:editar']);
    expect(can(agente, 'tickets:editar', { ownerUid: 'u1' })).toBe(true);
    expect(can(agente, 'tickets:editar', { ownerUid: 'otro' })).toBe(false);
  });

  it('con tickets:leer_todos edita cualquiera', () => {
    const sup = sessionUser('supervisor', ['tickets:editar', 'tickets:leer_todos']);
    expect(can(sup, 'tickets:editar', { ownerUid: 'otro' })).toBe(true);
  });

  it('permisos de portal exigen misma empresa', () => {
    const cli = sessionUser('cliente', ['portal:tickets'], { empresaId: 'e1' });
    expect(can(cli, 'portal:tickets', { empresaId: 'e1' })).toBe(true);
    expect(can(cli, 'portal:tickets', { empresaId: 'e2' })).toBe(false);
  });
});
