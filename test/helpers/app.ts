import { createApp } from '../../src/app.js';
import { buildContainer, type ContainerOverrides } from '../../src/config/container.js';
import { loadConfig } from '../../src/config/env.js';
import { SignedCookieSessionManager } from '../../src/infrastructure/auth/SignedCookieSessionManager.js';
import { Usuario } from '../../src/core/entities/Usuario.js';
import { InMemoryUsuarioRepository } from '../fakes/InMemoryUsuarioRepository.js';
import { FakeAuthProvider } from '../fakes/FakeAuthProvider.js';
import { FakeEmailSender } from '../fakes/FakeEmailSender.js';
import {
  InMemoryInvitacionRepository,
  InMemorySolicitudAccesoRepository,
} from '../fakes/InMemoryRepos.js';

export interface TestApp {
  app: ReturnType<typeof createApp>;
  usuarioRepo: InMemoryUsuarioRepository;
  authProvider: FakeAuthProvider;
  emailSender: FakeEmailSender;
  invitacionRepo: InMemoryInvitacionRepository;
}

/**
 * App con todas las dependencias de infraestructura sustituidas por fakes en memoria.
 * Útil para tests e2e de HTTP sin emulador ni credenciales.
 */
export function makeTestApp(opts: { usuarios?: { uid: string; email: string; password: string; nombre: string; rol: Usuario['rol']; empresaId?: string }[] } = {}): TestApp {
  const authProvider = new FakeAuthProvider();
  const usuarios: Usuario[] = [];
  for (const u of opts.usuarios ?? []) {
    authProvider.sembrar(u.email, u.password, u.uid);
    usuarios.push(
      new Usuario({
        uid: u.uid,
        email: u.email,
        nombre: u.nombre,
        rol: u.rol,
        ...(u.empresaId ? { empresaId: u.empresaId } : {}),
      }),
    );
  }
  const usuarioRepo = new InMemoryUsuarioRepository(usuarios);
  const emailSender = new FakeEmailSender();
  const invitacionRepo = new InMemoryInvitacionRepository();

  const overrides: ContainerOverrides = {
    usuarioRepo,
    authProvider,
    emailSender,
    invitacionRepo,
    solicitudAccesoRepo: new InMemorySolicitudAccesoRepository(),
    sessionManager: new SignedCookieSessionManager('test-secret-1234567890', 1000 * 60 * 60),
  };

  const container = buildContainer(loadConfig(), overrides);
  return { app: createApp(container), usuarioRepo, authProvider, emailSender, invitacionRepo };
}

/** Extrae el valor de una cookie de la cabecera Set-Cookie. */
export function cookieValor(setCookie: string[] | undefined, nombre: string): string | undefined {
  for (const c of setCookie ?? []) {
    const m = c.match(new RegExp(`^${nombre}=([^;]+)`));
    if (m) return decodeURIComponent(m[1]!);
  }
  return undefined;
}
