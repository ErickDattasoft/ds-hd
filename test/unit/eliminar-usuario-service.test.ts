import { beforeEach, describe, expect, it } from 'vitest';
import { EliminarUsuarioService } from '../../src/application/usuarios/EliminarUsuarioService.js';
import { Usuario } from '../../src/core/entities/Usuario.js';
import { ConflictError, ForbiddenError } from '../../src/core/errors/DomainError.js';
import type { SessionUser } from '../../src/application/shared/SessionUser.js';
import type { ITicketQueries } from '../../src/core/ports/repositories/ITicketQueries.js';
import { InMemoryUsuarioRepository } from '../fakes/InMemoryUsuarioRepository.js';
import { FakeAuthProvider } from '../fakes/FakeAuthProvider.js';
import { silentLogger } from '../fakes/support.js';

const actor = (uid: string): SessionUser => ({ uid, email: `${uid}@x.mx`, nombre: uid, permisos: [] }) as unknown as SessionUser;

describe('EliminarUsuarioService', () => {
  let auth: FakeAuthProvider;
  let repo: InMemoryUsuarioRepository;
  let abiertos: number;
  let service: EliminarUsuarioService;

  beforeEach(() => {
    abiertos = 0;
    auth = new FakeAuthProvider();
    auth.sembrar('ana@dattasoft.mx', 'clave1234', 'uid-ana');
    auth.sembrar('beto@dattasoft.mx', 'clave1234', 'uid-beto');
    repo = new InMemoryUsuarioRepository([
      new Usuario({ uid: 'uid-ana', email: 'ana@dattasoft.mx', nombre: 'Ana', rol: 'admin' }),
      new Usuario({ uid: 'uid-beto', email: 'beto@dattasoft.mx', nombre: 'Beto', rol: 'agente' }),
    ]);
    const tickets = { contar: async () => abiertos } as unknown as ITicketQueries;
    service = new EliminarUsuarioService(repo, auth, tickets, silentLogger);
  });

  it('borra la cuenta de acceso y el usuario', async () => {
    await expect(service.ejecutar({ actor: actor('uid-ana'), uid: 'uid-beto' })).resolves.toEqual({ nombre: 'Beto' });
    expect(await repo.findByUid('uid-beto')).toBeNull();
    await expect(auth.verifyPassword('beto@dattasoft.mx', 'clave1234')).rejects.toThrow();
  });

  it('no deja eliminarse a uno mismo ni al último admin', async () => {
    await expect(service.ejecutar({ actor: actor('uid-ana'), uid: 'uid-ana' })).rejects.toThrow(ForbiddenError);
    await expect(service.ejecutar({ actor: actor('uid-beto'), uid: 'uid-ana' })).rejects.toThrow(ConflictError);
  });

  it('pide reasignar antes los tickets abiertos', async () => {
    abiertos = 2;
    await expect(service.ejecutar({ actor: actor('uid-ana'), uid: 'uid-beto' })).rejects.toThrow(/2 tickets abiertos/);
    expect(await repo.findByUid('uid-beto')).not.toBeNull();
  });
});
