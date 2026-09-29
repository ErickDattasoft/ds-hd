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

describe('ContrasenaService — paridad con el viejo y errores claros', () => {
  const nuevo = () => {
    const auth = new FakeAuthProvider();
    auth.sembrar('ana@dattasoft.mx', 'Ds2026', 'uid-ana');
    const repo = new InMemoryUsuarioRepository([new Usuario({ uid: 'uid-ana', email: 'ana@dattasoft.mx', nombre: 'Ana', rol: 'admin' })]);
    return { auth, service: new ContrasenaService(repo, auth, silentLogger) };
  };
  const a = { uid: 'uid-ana', email: 'ana@dattasoft.mx', nombre: 'Ana', permisos: [] } as unknown as SessionUser;

  it('acepta 6 caracteres, como el viejo (la temporal Ds2026 tiene 6)', async () => {
    const { auth, service } = nuevo();
    await service.cambiarMia({ actor: a, actual: 'Ds2026', password: 'Rosa26', passwordConfirmacion: 'Rosa26' });
    await expect(auth.verifyPassword('ana@dattasoft.mx', 'Rosa26')).resolves.toBeTruthy();
    await expect(service.cambiarMia({ actor: a, actual: 'Rosa26', password: 'abc12', passwordConfirmacion: 'abc12' })).rejects.toThrow(ValidationError);
  });

  it('si Firebase rechaza la nueva, dice por qué en vez de «No se pudo»', async () => {
    const { auth, service } = nuevo();
    auth.setPassword = async () => {
      throw Object.assign(new Error('AuthRest /accounts:update: 400 PASSWORD_DOES_NOT_MEET_REQUIREMENTS : Missing password requirements: [Password must contain an upper case character]'), {
        status: 'PASSWORD_DOES_NOT_MEET_REQUIREMENTS',
      });
    };
    const err = await service
      .cambiarMia({ actor: a, actual: 'Ds2026', password: 'rosa2026', passwordConfirmacion: 'rosa2026' })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ValidationError);
    expect((err as ValidationError).message).toContain('upper case');
  });
});
