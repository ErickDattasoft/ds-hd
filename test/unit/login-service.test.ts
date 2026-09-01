import { beforeEach, describe, expect, it } from 'vitest';
import { LoginService } from '../../src/application/auth/LoginService.js';
import { SignedCookieSessionManager } from '../../src/infrastructure/auth/SignedCookieSessionManager.js';
import { Usuario } from '../../src/core/entities/Usuario.js';
import { UnauthorizedError } from '../../src/core/errors/DomainError.js';
import { InMemoryUsuarioRepository } from '../fakes/InMemoryUsuarioRepository.js';
import { FakeAuthProvider } from '../fakes/FakeAuthProvider.js';
import { FixedClock, silentLogger } from '../fakes/support.js';

describe('LoginService', () => {
  let repo: InMemoryUsuarioRepository;
  let auth: FakeAuthProvider;
  let sesiones: SignedCookieSessionManager;
  let clock: FixedClock;
  let service: LoginService;

  beforeEach(() => {
    auth = new FakeAuthProvider();
    const uid = auth.sembrar('ana@dattasoft.mx', 'secreta123', 'uid-ana');
    repo = new InMemoryUsuarioRepository([
      new Usuario({ uid, email: 'ana@dattasoft.mx', nombre: 'Ana', rol: 'agente' }),
    ]);
    sesiones = new SignedCookieSessionManager('un-secreto-de-prueba', 1000 * 60 * 60);
    clock = new FixedClock(new Date('2026-09-01T12:00:00Z'));
    service = new LoginService(repo, auth, sesiones, clock, silentLogger);
  });

  it('emite un token verificable y registra el acceso', async () => {
    const { token, usuario } = await service.ejecutar({
      email: 'ANA@dattasoft.mx',
      password: 'secreta123',
    });
    expect(usuario.uid).toBe('uid-ana');
    expect(usuario.lastLoginAt).toEqual(clock.now());

    const claims = await sesiones.verify(token);
    expect(claims?.uid).toBe('uid-ana');
  });

  it('rechaza contraseña incorrecta con mensaje genérico', async () => {
    await expect(service.ejecutar({ email: 'ana@dattasoft.mx', password: 'mala' })).rejects.toThrow(
      UnauthorizedError,
    );
  });

  it('rechaza si el usuario está desactivado', async () => {
    const u = await repo.findByUid('uid-ana');
    u!.desactivar();
    await repo.save(u!);
    await expect(
      service.ejecutar({ email: 'ana@dattasoft.mx', password: 'secreta123' }),
    ).rejects.toThrow(/desactivada/);
  });

  it('rechaza si la identidad existe pero no hay documento de usuario', async () => {
    auth.sembrar('fantasma@dattasoft.mx', 'x', 'uid-fantasma');
    await expect(
      service.ejecutar({ email: 'fantasma@dattasoft.mx', password: 'x' }),
    ).rejects.toThrow(UnauthorizedError);
  });
});
