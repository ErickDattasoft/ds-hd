import { describe, expect, it } from 'vitest';
import { aplicarCasillas, casillaMarcada } from '../../src/interfaces/http/rbac/apartados.js';
import { permisosDeRol } from '../../src/interfaces/http/rbac/roles.js';

const efectivosDe = (roles: ('soporte' | 'ventas')[], extras: string[] = [], revocados: string[] = []) => {
  const set = new Set<string>(extras);
  for (const r of roles) for (const p of permisosDeRol(r)) set.add(p);
  for (const p of revocados) set.delete(p);
  return [...set];
};

describe('Permisos por apartado (casillas)', () => {
  it('Gaby (ventas) recibe Editar en Tickets: se agregan Ver y Editar como extras', () => {
    const gaby = { roles: ['ventas'] as const, permisosExtra: [], permisosRevocados: [] };
    const r = aplicarCasillas(gaby as never, efectivosDe(['ventas']), new Map([['tickets', { editar: true }]]));
    expect(r.permisosExtra).toEqual(
      expect.arrayContaining(['tickets:leer', 'tickets:crear', 'tickets:editar', 'tickets:asignar', 'tickets:cambiar_estado']),
    );
    expect(r.permisosExtra).not.toContain('tickets:leer_todos');
    expect(r.permisosRevocados).toEqual([]);
  });

  it('quitar Ver de un apartado que trae el rol lo revoca, junto con Editar', () => {
    const sop = { roles: ['soporte'] as const, permisosExtra: [], permisosRevocados: [] };
    const r = aplicarCasillas(sop as never, efectivosDe(['soporte']), new Map([['tickets', { ver: false }]]));
    expect(r.permisosRevocados).toEqual(expect.arrayContaining(['tickets:leer', 'tickets:editar']));
    expect(r.permisosExtra).toEqual([]);
  });

  it('volver a dar lo revocado limpia el override en vez de agregar un extra', () => {
    const sop = { roles: ['soporte'] as const, permisosExtra: [], permisosRevocados: ['empresas:leer'] };
    const r = aplicarCasillas(sop as never, efectivosDe(['soporte'], [], ['empresas:leer']), new Map([['empresas', { ver: true }]]));
    expect(r.permisosRevocados).toEqual([]);
    expect(r.permisosExtra).toEqual([]);
  });

  it('lo que no se tocó no cambia', () => {
    const u = { roles: ['soporte'] as const, permisosExtra: ['bitacora:leer'], permisosRevocados: ['versiones:leer'] };
    const r = aplicarCasillas(u as never, efectivosDe(['soporte'], ['bitacora:leer'], ['versiones:leer']), new Map());
    expect(r).toEqual({ permisosExtra: ['bitacora:leer'], permisosRevocados: ['versiones:leer'] });
    expect(casillaMarcada(['a:b'], ['a:b' as never])).toBe(true);
  });
});
