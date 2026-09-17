import { beforeEach, describe, expect, it } from 'vitest';
import { ContrasenaService } from '../../src/application/usuarios/ContrasenaService.js';
import { Usuario } from '../../src/core/entities/Usuario.js';
import { ForbiddenError, ValidationError } from '../../src/core/errors/DomainError.js';
import type { SessionUser } from '../../src/application/shared/SessionUser.js';
import { InMemoryUsuarioRepository } from '../fakes/InMemoryUsuarioRepository.js';
import { FakeAuthProvider } from '../fakes/FakeAuthProvider.js';
import { silentLogger } from '../fakes/support.js';

const actor = (uid: string, email: string, permisos: string[] = []): SessionUser =>
  ({ uid, email, nombre: uid, permisos }) as unknown as SessionUser;

describe('ContrasenaService', () => {
  let auth: FakeAuthProvider;
  let service: ContrasenaService;

  beforeEach(() => {
    auth = new FakeAuthProvider();
    auth.sembrar('ana@dattasoft.mx', 'vieja1234', 'uid-ana');
    auth.sembrar('beto@dattasoft.mx', 'olvidada1', 'uid-beto');
    const repo = new InMemoryUsuarioRepository([
      new Usuario({ uid: 'uid-ana', email: 'ana@dattasoft.mx', nombre: 'Ana', rol: 'admin' }),
      new Usuario({ uid: 'uid-beto', email: 'beto@dattasoft.mx', nombre: 'Beto', rol: 'agente' }),
    ]);
    service = new ContrasenaService(repo, auth, silentLogger);
  });

  it('cambia la propia contraseña si la actual es correcta', async () => {
    await service.cambiarMia({
      actor: actor('uid-ana', 'ana@dattasoft.mx'),
      actual: 'vieja1234',
      password: 'nueva5678',
      passwordConfirmacion: 'nueva5678',
    });
    await expect(auth.verifyPassword('ana@dattasoft.mx', 'nueva5678')).resolves.toBeTruthy();
  });

  it('rechaza si la contraseña actual es incorrecta, corta o no coincide', async () => {
    const a = actor('uid-ana', 'ana@dattasoft.mx');
    await expect(
      service.cambiarMia({ actor: a, actual: 'mala', password: 'nueva5678', passwordConfirmacion: 'nueva5678' }),
    ).rejects.toThrow(ValidationError);
    await expect(
      service.cambiarMia({ actor: a, actual: 'vieja1234', password: 'corta', passwordConfirmacion: 'corta' }),
    ).rejects.toThrow(ValidationError);
    await expect(
      service.cambiarMia({ actor: a, actual: 'vieja1234', password: 'nueva5678', passwordConfirmacion: 'otra5678' }),
    ).rejects.toThrow(ValidationError);
  });

  it('un admin restablece la contraseña de otro y corta sus sesiones', async () => {
    await service.restablecer({
      actor: actor('uid-ana', 'ana@dattasoft.mx', ['usuarios:gestionar']),
      uid: 'uid-beto',
      password: 'temporal1',
      passwordConfirmacion: 'temporal1',
    });
    await expect(auth.verifyPassword('beto@dattasoft.mx', 'temporal1')).resolves.toBeTruthy();
    expect(auth.revocados).toContain('uid-beto');
  });

  it('sin permiso no puede restablecer', async () => {
    await expect(
      service.restablecer({
        actor: actor('uid-beto', 'beto@dattasoft.mx'),
        uid: 'uid-ana',
        password: 'temporal1',
        passwordConfirmacion: 'temporal1',
      }),
    ).rejects.toThrow(ForbiddenError);
  });
});
