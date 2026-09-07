import { beforeEach, describe, expect, it } from 'vitest';
import { FiltrosGuardadosService } from '../../src/application/shared/FiltrosGuardadosService.js';
import { MAX_FILTROS_POR_MODULO } from '../../src/core/entities/FiltroGuardado.js';
import { InMemoryFiltroGuardadoRepository } from '../fakes/InMemoryFiltroGuardadoRepository.js';
import { FixedClock } from '../fakes/support.js';
import type { SessionUser } from '../../src/application/shared/SessionUser.js';

const actor = (uid: string): SessionUser =>
  ({
    uid,
    nombre: uid,
    email: `${uid}@x.mx`,
    roles: ['ventas'],
    rol: 'ventas',
    esTecnico: false,
    empresaId: null,
    activo: true,
    esStaff: true,
    esCliente: false,
    permisos: [],
  }) as SessionUser;

let seq = 0;
const ids = { newId: () => `f${++seq}`, newToken: () => `t${++seq}` };

describe('FiltrosGuardadosService', () => {
  let repo: InMemoryFiltroGuardadoRepository;
  let svc: FiltrosGuardadosService;

  beforeEach(() => {
    seq = 0;
    repo = new InMemoryFiltroGuardadoRepository();
    svc = new FiltrosGuardadosService(repo, ids, new FixedClock(new Date('2026-09-07T12:00:00Z')));
  });

  it('guarda y normaliza la query (quita vacíos, volver, _csrf; ordena)', async () => {
    const f = await svc.guardar(actor('u1'), {
      nombre: 'Favoritas Contpaqi',
      modulo: 'empresas',
      query: '?sistema=Contpaqi&q=&favoritas=1&volver=/app/empresas&_csrf=x',
    });
    expect(f.query).toBe('favoritas=1&sistema=Contpaqi');
    expect((await svc.listar(actor('u1'), 'empresas'))).toHaveLength(1);
  });

  it('reemplaza en vez de duplicar cuando el nombre coincide (case-insensitive)', async () => {
    await svc.guardar(actor('u1'), { nombre: 'Vencidas', modulo: 'empresas', query: 'pendientes=1' });
    await svc.guardar(actor('u1'), { nombre: 'vencidas', modulo: 'empresas', query: 'favoritas=1' });
    const lista = await svc.listar(actor('u1'), 'empresas');
    expect(lista).toHaveLength(1);
    expect(lista[0]!.query).toBe('favoritas=1');
  });

  it('cada usuario solo ve los suyos', async () => {
    await svc.guardar(actor('u1'), { nombre: 'Mío', modulo: 'empresas', query: 'favoritas=1' });
    expect(await svc.listar(actor('u2'), 'empresas')).toHaveLength(0);
  });

  it('rechaza borrar un filtro ajeno', async () => {
    const f = await svc.guardar(actor('u1'), { nombre: 'Mío', modulo: 'empresas', query: 'favoritas=1' });
    await expect(svc.eliminar(actor('u2'), f.id)).rejects.toThrow(/no es tuyo/);
    expect(await repo.findById(f.id)).not.toBeNull();
  });

  it('limita la cantidad por módulo', async () => {
    for (let i = 0; i < MAX_FILTROS_POR_MODULO; i++) {
      await svc.guardar(actor('u1'), { nombre: `F${i}`, modulo: 'empresas', query: `q=${i}` });
    }
    await expect(
      svc.guardar(actor('u1'), { nombre: 'uno más', modulo: 'empresas', query: 'q=z' }),
    ).rejects.toThrow(/máximo/);
  });

  it('rechaza query vacía o nombre corto', async () => {
    await expect(
      svc.guardar(actor('u1'), { nombre: 'ok', modulo: 'empresas', query: '?q=' }),
    ).rejects.toThrow(/filtros que guardar/);
    await expect(
      svc.guardar(actor('u1'), { nombre: 'x', modulo: 'empresas', query: 'favoritas=1' }),
    ).rejects.toThrow(/nombre/);
  });
});
