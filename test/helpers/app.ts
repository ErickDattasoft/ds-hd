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
import {
  InMemoryTicketStore,
  InMemoryTicketRepository,
  InMemoryTicketQueries,
  InMemoryContadorRepository,
  InMemoryConfiguracionRepository,
  InMemoryTicketPublicoRepository,
  FakeWebhookPublisher,
  FakeCaptchaVerifier,
} from '../fakes/tickets.js';
import {
  InMemoryEmpresaRepository,
  InMemoryContactoRepository,
  InMemoryBitacoraRepository,
} from '../fakes/crm.js';
import { InMemoryIntentosLoginRepository } from '../fakes/InMemoryIntentosLoginRepository.js';
import { InMemoryFiltroGuardadoRepository } from '../fakes/InMemoryFiltroGuardadoRepository.js';
import { InMemoryVersionRepository, InMemoryKnowledgeRepository } from '../fakes/kb.js';
import { InMemoryCotizacionRepository } from '../fakes/cotizaciones.js';
import { InMemoryInteraccionRepository, InMemoryTareaRepository } from '../fakes/seguimiento.js';
import {
  InMemoryEventoRepository,
  InMemoryInscripcionRepository,
  InMemoryListaNegraRepository,
} from '../fakes/eventos.js';

export interface TestApp {
  app: ReturnType<typeof createApp>;
  usuarioRepo: InMemoryUsuarioRepository;
  authProvider: FakeAuthProvider;
  emailSender: FakeEmailSender;
  invitacionRepo: InMemoryInvitacionRepository;
  ticketStore: InMemoryTicketStore;
  ticketPublicoRepo: InMemoryTicketPublicoRepository;
  webhookPublisher: FakeWebhookPublisher;
  configuracionRepo: InMemoryConfiguracionRepository;
  empresaRepo: InMemoryEmpresaRepository;
  contactoRepo: InMemoryContactoRepository;
  bitacoraRepo: InMemoryBitacoraRepository;
  versionRepo: InMemoryVersionRepository;
  knowledgeRepo: InMemoryKnowledgeRepository;
  cotizacionRepo: InMemoryCotizacionRepository;
  interaccionRepo: InMemoryInteraccionRepository;
  tareaRepo: InMemoryTareaRepository;
  eventoRepo: InMemoryEventoRepository;
  inscripcionRepo: InMemoryInscripcionRepository;
  listaNegraRepo: InMemoryListaNegraRepository;
  filtroGuardadoRepo: InMemoryFiltroGuardadoRepository;
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
  const ticketStore = new InMemoryTicketStore();
  const ticketPublicoRepo = new InMemoryTicketPublicoRepository();
  const webhookPublisher = new FakeWebhookPublisher();
  const configuracionRepo = new InMemoryConfiguracionRepository();
  const empresaRepo = new InMemoryEmpresaRepository();
  const contactoRepo = new InMemoryContactoRepository();
  const bitacoraRepo = new InMemoryBitacoraRepository();
  const versionRepo = new InMemoryVersionRepository();
  const knowledgeRepo = new InMemoryKnowledgeRepository();
  const cotizacionRepo = new InMemoryCotizacionRepository();
  const interaccionRepo = new InMemoryInteraccionRepository();
  const tareaRepo = new InMemoryTareaRepository();
  const eventoRepo = new InMemoryEventoRepository();
  const inscripcionRepo = new InMemoryInscripcionRepository();
  const listaNegraRepo = new InMemoryListaNegraRepository();

  const overrides: ContainerOverrides = {
    usuarioRepo,
    authProvider,
    emailSender,
    invitacionRepo,
    solicitudAccesoRepo: new InMemorySolicitudAccesoRepository(),
    sessionManager: new SignedCookieSessionManager(
      'test-secret-1234567890',
      1000 * 60 * 60,
      1000 * 60 * 60,
    ),
    intentosLoginRepo: new InMemoryIntentosLoginRepository(),
    filtroGuardadoRepo: new InMemoryFiltroGuardadoRepository(),
    ticketRepo: new InMemoryTicketRepository(ticketStore),
    ticketQueries: new InMemoryTicketQueries(ticketStore),
    contadorRepo: new InMemoryContadorRepository(),
    configuracionRepo,
    ticketPublicoRepo,
    webhookPublisher,
    captchaVerifier: new FakeCaptchaVerifier(),
    empresaRepo,
    contactoRepo,
    bitacoraRepo,
    versionRepo,
    knowledgeRepo,
    cotizacionRepo,
    interaccionRepo,
    tareaRepo,
    eventoRepo,
    inscripcionRepo,
    listaNegraRepo,
  };

  const container = buildContainer(loadConfig(), overrides);
  return {
    app: createApp(container),
    usuarioRepo,
    authProvider,
    emailSender,
    invitacionRepo,
    ticketStore,
    ticketPublicoRepo,
    webhookPublisher,
    configuracionRepo,
    empresaRepo,
    contactoRepo,
    bitacoraRepo,
    versionRepo,
    knowledgeRepo,
    cotizacionRepo,
    interaccionRepo,
    tareaRepo,
    eventoRepo,
    inscripcionRepo,
    listaNegraRepo,
    filtroGuardadoRepo: overrides.filtroGuardadoRepo as InMemoryFiltroGuardadoRepository,
  };
}

/** Extrae el valor de una cookie de la cabecera Set-Cookie. */
export function cookieValor(setCookie: string[] | undefined, nombre: string): string | undefined {
  for (const c of setCookie ?? []) {
    const m = c.match(new RegExp(`^${nombre}=([^;]+)`));
    if (m) return decodeURIComponent(m[1]!);
  }
  return undefined;
}
