import { beforeEach, describe, expect, it } from 'vitest';
import { HistorialBusquedaKBService } from '../../src/application/knowledge/HistorialBusquedaKBService.js';
import { MAX_BUSQUEDAS_KB_POR_USUARIO } from '../../src/core/entities/BusquedaKB.js';
import { InMemoryBusquedaKBRepository } from '../fakes/kb.js';
import { FixedClock } from '../fakes/support.js';
import type { SessionUser } from '../../src/application/shared/SessionUser.js';

const actor = (uid: string): SessionUser =>
  ({
    uid,
    nombre: uid,
    email: `${uid}@x.mx`,
    roles: ['cliente'],
    rol: 'cliente',
    esTecnico: false,
    empresaId: null,
    activo: true,
    esStaff: false,
    esCliente: true,
    permisos: [],
  }) as SessionUser;

let seq = 0;
const ids = { newId: () => `b${++seq}`, newToken: () => `t${++seq}` };

describe('HistorialBusquedaKBService', () => {
  let repo: InMemoryBusquedaKBRepository;
  let clock: FixedClock;
  let svc: HistorialBusquedaKBService;

  beforeEach(() => {
    seq = 0;
    repo = new InMemoryBusquedaKBRepository();
    clock = new FixedClock(new Date('2026-09-16T12:00:00Z'));
    svc = new HistorialBusquedaKBService(repo, ids, clock);
  });

  it('registra búsquedas, más recientes primero', async () => {
    await svc.registrar(actor('u1'), 'contpaqi');
    clock.avanzarMs(1000);
    await svc.registrar(actor('u1'), 'nomina');
    const lista = await svc.listar(actor('u1'));
    expect(lista.map((b) => b.texto)).toEqual(['nomina', 'contpaqi']);
  });

  it('ignora texto muy corto', async () => {
    await svc.registrar(actor('u1'), 'a');
    expect(await svc.listar(actor('u1'))).toHaveLength(0);
  });

  it('no duplica si repite la búsqueda más reciente', async () => {
    await svc.registrar(actor('u1'), 'contpaqi');
    await svc.registrar(actor('u1'), 'Contpaqi');
    expect(await svc.listar(actor('u1'))).toHaveLength(1);
  });

  it('recorta al máximo permitido por usuario', async () => {
    for (let i = 0; i < MAX_BUSQUEDAS_KB_POR_USUARIO + 3; i++) {
      await svc.registrar(actor('u1'), `busqueda-${i}`);
      clock.avanzarMs(1000);
    }
    const lista = await svc.listar(actor('u1'));
    expect(lista).toHaveLength(MAX_BUSQUEDAS_KB_POR_USUARIO);
    expect(lista[0]!.texto).toBe(`busqueda-${MAX_BUSQUEDAS_KB_POR_USUARIO + 2}`);
  });

  it('cada usuario ve solo lo suyo; limpiar borra todo su historial', async () => {
    await svc.registrar(actor('u1'), 'mío');
    await svc.registrar(actor('u2'), 'ajeno');
    expect(await svc.listar(actor('u2'))).toHaveLength(1);
    await svc.limpiar(actor('u1'));
    expect(await svc.listar(actor('u1'))).toHaveLength(0);
    expect(await svc.listar(actor('u2'))).toHaveLength(1);
  });
});
