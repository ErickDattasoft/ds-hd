import { beforeEach, describe, expect, it } from 'vitest';
import { PizarraKBService } from '../../src/application/knowledge/PizarraKBService.js';
import { PIZARRA_KB_MAX } from '../../src/core/entities/PizarraKB.js';
import { InMemoryPizarraKBRepository } from '../fakes/kb.js';
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

describe('PizarraKBService', () => {
  let repo: InMemoryPizarraKBRepository;
  let svc: PizarraKBService;

  beforeEach(() => {
    repo = new InMemoryPizarraKBRepository();
    svc = new PizarraKBService(repo, new FixedClock(new Date('2026-09-16T12:00:00Z')));
  });

  it('obtener sin pizarra guardada devuelve vacío', async () => {
    expect(await svc.obtener(actor('u1'))).toBe('');
  });

  it('guarda y devuelve el contenido más reciente', async () => {
    await svc.guardar(actor('u1'), 'notas iniciales');
    expect(await svc.obtener(actor('u1'))).toBe('notas iniciales');
    await svc.guardar(actor('u1'), 'notas actualizadas');
    expect(await svc.obtener(actor('u1'))).toBe('notas actualizadas');
  });

  it('cada usuario tiene su propia pizarra', async () => {
    await svc.guardar(actor('u1'), 'de u1');
    expect(await svc.obtener(actor('u2'))).toBe('');
  });

  it('rechaza contenido demasiado largo', async () => {
    await expect(svc.guardar(actor('u1'), 'x'.repeat(PIZARRA_KB_MAX + 1))).rejects.toThrow(/no puede pasar/);
  });
});
