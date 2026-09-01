import { asFunction, asValue, createContainer, InjectionMode, type AwilixContainer } from 'awilix';
import type { AppConfig } from './env.js';
import { initFirebase, type FirebaseServices } from './firebase.js';
import { PinoLogger } from '../infrastructure/system/PinoLogger.js';
import { SystemClock } from '../infrastructure/system/SystemClock.js';
import { UuidGenerator } from '../infrastructure/system/UuidGenerator.js';
import { SignedCookieSessionManager } from '../infrastructure/auth/SignedCookieSessionManager.js';
import { FirebaseAuthProvider } from '../infrastructure/auth/FirebaseAuthProvider.js';
import { FirestoreUsuarioRepository } from '../infrastructure/firestore/FirestoreUsuarioRepository.js';
import { FirestoreSolicitudAccesoRepository } from '../infrastructure/firestore/FirestoreSolicitudAccesoRepository.js';
import { FirestoreInvitacionRepository } from '../infrastructure/firestore/FirestoreInvitacionRepository.js';
import { BrevoEmailSender } from '../infrastructure/email/BrevoEmailSender.js';
import { LoggingEmailSender } from '../infrastructure/email/LoggingEmailSender.js';
import { FirestoreTicketRepository } from '../infrastructure/firestore/FirestoreTicketRepository.js';
import { FirestoreTicketQueries } from '../infrastructure/firestore/FirestoreTicketQueries.js';
import { FirestoreContadorRepository } from '../infrastructure/firestore/FirestoreContadorRepository.js';
import { FirestoreConfiguracionRepository } from '../infrastructure/firestore/FirestoreConfiguracionRepository.js';
import { FirestoreTicketPublicoRepository } from '../infrastructure/firestore/FirestoreTicketPublicoRepository.js';
import { N8nWebhookPublisher, NullWebhookPublisher } from '../infrastructure/webhooks/N8nWebhookPublisher.js';
import { TurnstileVerifier, NullCaptchaVerifier } from '../infrastructure/captcha/TurnstileVerifier.js';
import { LoginService } from '../application/auth/LoginService.js';
import { SolicitarAccesoService } from '../application/auth/SolicitarAccesoService.js';
import { CrearUsuarioService } from '../application/usuarios/CrearUsuarioService.js';
import { ActualizarUsuarioService } from '../application/usuarios/ActualizarUsuarioService.js';
import { InvitarClienteService } from '../application/usuarios/InvitarClienteService.js';
import { AceptarInvitacionService } from '../application/usuarios/AceptarInvitacionService.js';
import { ActualizarMiPerfilService } from '../application/portal/ActualizarMiPerfilService.js';
import { CrearTicketService } from '../application/tickets/CrearTicketService.js';
import { ActualizarEstadoTicketService } from '../application/tickets/ActualizarEstadoTicketService.js';
import { AsignarAgenteService } from '../application/tickets/AsignarAgenteService.js';
import { RegistrarNotaService } from '../application/tickets/RegistrarNotaService.js';
import { MarcarFacturacionService } from '../application/tickets/MarcarFacturacionService.js';
import { ListarTicketsService } from '../application/tickets/ListarTicketsService.js';
import { VerTicketService } from '../application/tickets/VerTicketService.js';
import { PanelCargaAgentesService } from '../application/tickets/PanelCargaAgentesService.js';
import { CrearTicketPublicoService } from '../application/tickets/CrearTicketPublicoService.js';
import { GestionTicketPublicoService } from '../application/tickets/GestionTicketPublicoService.js';
import { ConfiguracionTicketsService } from '../application/configuracion/ConfiguracionTicketsService.js';
import { AuthController } from '../interfaces/http/controllers/public/AuthController.js';
import { UsuarioController } from '../interfaces/http/controllers/backoffice/UsuarioController.js';
import { PortalPerfilController } from '../interfaces/http/controllers/portal/PortalPerfilController.js';
import { TicketController } from '../interfaces/http/controllers/backoffice/TicketController.js';
import { ConfiguracionController } from '../interfaces/http/controllers/backoffice/ConfiguracionController.js';
import { TicketPublicoController } from '../interfaces/http/controllers/public/TicketPublicoController.js';
import { BrevoWebhookController } from '../interfaces/http/controllers/webhooks/BrevoWebhookController.js';
import { SESSION_COOKIE_MAX_AGE_MS } from './constants.js';
import type { ILogger } from '../core/ports/services/ILogger.js';
import type { IClock } from '../core/ports/services/IClock.js';
import type { IIdGenerator } from '../core/ports/services/IIdGenerator.js';
import type { IAuthProvider } from '../core/ports/services/IAuthProvider.js';
import type { ISessionManager } from '../core/ports/services/ISessionManager.js';
import type { IEmailSender } from '../core/ports/services/IEmailSender.js';
import type { IUsuarioRepository } from '../core/ports/repositories/IUsuarioRepository.js';
import type { ISolicitudAccesoRepository } from '../core/ports/repositories/ISolicitudAccesoRepository.js';
import type { IInvitacionRepository } from '../core/ports/repositories/IInvitacionRepository.js';
import type { ITicketRepository } from '../core/ports/repositories/ITicketRepository.js';
import type { ITicketQueries } from '../core/ports/repositories/ITicketQueries.js';
import type { IContadorRepository } from '../core/ports/repositories/IContadorRepository.js';
import type { IConfiguracionRepository } from '../core/ports/repositories/IConfiguracionRepository.js';
import type { ITicketPublicoRepository } from '../core/ports/repositories/ITicketPublicoRepository.js';
import type { IWebhookPublisher } from '../core/ports/services/IWebhookPublisher.js';
import type { ICaptchaVerifier } from '../core/ports/services/ICaptchaVerifier.js';

/**
 * Todo lo resoluble del contenedor. Las capas internas reciben estas dependencias por
 * constructor; SOLO el borde HTTP (routers) llama a `container.resolve`.
 */
export interface Cradle {
  config: AppConfig;
  logger: ILogger;
  clock: IClock;
  idGenerator: IIdGenerator;
  firebase: FirebaseServices | null;

  // Puertos → adaptadores
  authProvider: IAuthProvider;
  sessionManager: ISessionManager;
  emailSender: IEmailSender;
  usuarioRepo: IUsuarioRepository;
  solicitudAccesoRepo: ISolicitudAccesoRepository;
  invitacionRepo: IInvitacionRepository;
  ticketRepo: ITicketRepository;
  ticketQueries: ITicketQueries;
  contadorRepo: IContadorRepository;
  configuracionRepo: IConfiguracionRepository;
  ticketPublicoRepo: ITicketPublicoRepository;
  webhookPublisher: IWebhookPublisher;
  captchaVerifier: ICaptchaVerifier;

  // Casos de uso
  loginService: LoginService;
  solicitarAccesoService: SolicitarAccesoService;
  crearUsuarioService: CrearUsuarioService;
  actualizarUsuarioService: ActualizarUsuarioService;
  invitarClienteService: InvitarClienteService;
  aceptarInvitacionService: AceptarInvitacionService;
  actualizarMiPerfilService: ActualizarMiPerfilService;
  crearTicketService: CrearTicketService;
  actualizarEstadoTicketService: ActualizarEstadoTicketService;
  asignarAgenteService: AsignarAgenteService;
  registrarNotaService: RegistrarNotaService;
  marcarFacturacionService: MarcarFacturacionService;
  listarTicketsService: ListarTicketsService;
  verTicketService: VerTicketService;
  panelCargaAgentesService: PanelCargaAgentesService;
  crearTicketPublicoService: CrearTicketPublicoService;
  gestionTicketPublicoService: GestionTicketPublicoService;
  configuracionTicketsService: ConfiguracionTicketsService;

  // Controllers
  authController: AuthController;
  usuarioController: UsuarioController;
  portalPerfilController: PortalPerfilController;
  ticketController: TicketController;
  configuracionController: ConfiguracionController;
  ticketPublicoController: TicketPublicoController;
  brevoWebhookController: BrevoWebhookController;
}

export type Container = AwilixContainer<Cradle>;

/** Overrides para tests: reemplazan registros por fakes. */
export type ContainerOverrides = Partial<{
  [K in keyof Cradle]: Cradle[K];
}>;

function requireFirebase(fb: FirebaseServices | null): FirebaseServices {
  if (!fb) {
    throw new Error(
      'Se necesita firebase-admin para esta operación (define credenciales o FIRESTORE_EMULATOR_HOST).',
    );
  }
  return fb;
}

/** Composition root: único lugar donde se instancian adaptadores concretos. */
export function buildContainer(config: AppConfig, overrides: ContainerOverrides = {}): Container {
  const container = createContainer<Cradle>({ injectionMode: InjectionMode.PROXY, strict: true });

  const logger = PinoLogger.create({
    level: config.logLevel,
    pretty: !config.isProduction && !config.isTest,
  });

  container.register({
    config: asValue(config),
    logger: asValue(logger),
    clock: asFunction(() => new SystemClock()).singleton(),
    idGenerator: asFunction(() => new UuidGenerator()).singleton(),
    firebase: asValue(initFirebase(config, logger)),

    authProvider: asFunction(
      ({ firebase, config: c, logger: l }: Cradle): IAuthProvider =>
        new FirebaseAuthProvider(requireFirebase(firebase).auth, {
          apiKey: c.firebase.apiKey,
          emulatorHost: c.firebase.authEmulatorHost || process.env.FIREBASE_AUTH_EMULATOR_HOST || '',
        }, l),
    ).singleton(),

    sessionManager: asFunction(
      ({ config: c }: Cradle): ISessionManager =>
        new SignedCookieSessionManager(c.session.secret, SESSION_COOKIE_MAX_AGE_MS),
    ).singleton(),

    emailSender: asFunction(({ config: c, logger: l }: Cradle): IEmailSender =>
      c.brevo.apiKey
        ? new BrevoEmailSender(
            { apiKey: c.brevo.apiKey, senderName: c.brevo.senderName, senderEmail: c.brevo.senderEmail },
            l,
          )
        : new LoggingEmailSender(l),
    ).singleton(),

    usuarioRepo: asFunction(
      ({ firebase }: Cradle): IUsuarioRepository =>
        new FirestoreUsuarioRepository(requireFirebase(firebase).firestore),
    ).singleton(),
    solicitudAccesoRepo: asFunction(
      ({ firebase }: Cradle): ISolicitudAccesoRepository =>
        new FirestoreSolicitudAccesoRepository(requireFirebase(firebase).firestore),
    ).singleton(),
    invitacionRepo: asFunction(
      ({ firebase }: Cradle): IInvitacionRepository =>
        new FirestoreInvitacionRepository(requireFirebase(firebase).firestore),
    ).singleton(),
    ticketRepo: asFunction(
      ({ firebase }: Cradle): ITicketRepository =>
        new FirestoreTicketRepository(requireFirebase(firebase).firestore),
    ).singleton(),
    ticketQueries: asFunction(
      ({ firebase }: Cradle): ITicketQueries =>
        new FirestoreTicketQueries(requireFirebase(firebase).firestore),
    ).singleton(),
    contadorRepo: asFunction(
      ({ firebase }: Cradle): IContadorRepository =>
        new FirestoreContadorRepository(requireFirebase(firebase).firestore),
    ).singleton(),
    configuracionRepo: asFunction(
      ({ firebase }: Cradle): IConfiguracionRepository =>
        new FirestoreConfiguracionRepository(requireFirebase(firebase).firestore),
    ).singleton(),
    ticketPublicoRepo: asFunction(
      ({ firebase }: Cradle): ITicketPublicoRepository =>
        new FirestoreTicketPublicoRepository(requireFirebase(firebase).firestore),
    ).singleton(),
    webhookPublisher: asFunction(({ config: c, logger: l }: Cradle): IWebhookPublisher =>
      c.n8n.ticketsWebhook || c.n8n.cotizacionesWebhook
        ? new N8nWebhookPublisher(
            { tickets: c.n8n.ticketsWebhook, cotizaciones: c.n8n.cotizacionesWebhook },
            l,
          )
        : new NullWebhookPublisher(),
    ).singleton(),
    captchaVerifier: asFunction(({ config: c, logger: l }: Cradle): ICaptchaVerifier =>
      c.turnstile.secret ? new TurnstileVerifier(c.turnstile.secret, l) : new NullCaptchaVerifier(),
    ).singleton(),

    loginService: asFunction(
      (c: Cradle) =>
        new LoginService(c.usuarioRepo, c.authProvider, c.sessionManager, c.clock, c.logger),
    ).singleton(),
    solicitarAccesoService: asFunction(
      (c: Cradle) =>
        new SolicitarAccesoService(c.solicitudAccesoRepo, c.usuarioRepo, c.emailSender, c.logger),
    ).singleton(),
    crearUsuarioService: asFunction(
      (c: Cradle) =>
        new CrearUsuarioService(
          c.usuarioRepo,
          c.invitacionRepo,
          c.authProvider,
          c.emailSender,
          c.idGenerator,
          c.clock,
          c.logger,
          c.config.baseUrl,
          72,
        ),
    ).singleton(),
    actualizarUsuarioService: asFunction(
      (c: Cradle) =>
        new ActualizarUsuarioService(c.usuarioRepo, c.authProvider, c.clock, c.logger),
    ).singleton(),
    invitarClienteService: asFunction(
      (c: Cradle) =>
        new InvitarClienteService(
          c.usuarioRepo,
          c.invitacionRepo,
          c.authProvider,
          c.emailSender,
          c.idGenerator,
          c.clock,
          c.logger,
          c.config.baseUrl,
          72,
        ),
    ).singleton(),
    aceptarInvitacionService: asFunction(
      (c: Cradle) =>
        new AceptarInvitacionService(c.invitacionRepo, c.usuarioRepo, c.authProvider, c.clock, c.logger),
    ).singleton(),
    actualizarMiPerfilService: asFunction(
      (c: Cradle) => new ActualizarMiPerfilService(c.usuarioRepo, c.clock),
    ).singleton(),

    crearTicketService: asFunction(
      (c: Cradle) =>
        new CrearTicketService(
          c.ticketRepo,
          c.contadorRepo,
          c.configuracionRepo,
          c.idGenerator,
          c.clock,
          c.webhookPublisher,
          c.logger,
        ),
    ).singleton(),
    actualizarEstadoTicketService: asFunction(
      (c: Cradle) =>
        new ActualizarEstadoTicketService(
          c.ticketRepo,
          c.configuracionRepo,
          c.idGenerator,
          c.clock,
          c.emailSender,
          c.webhookPublisher,
          c.logger,
        ),
    ).singleton(),
    asignarAgenteService: asFunction(
      (c: Cradle) =>
        new AsignarAgenteService(
          c.ticketRepo,
          c.ticketQueries,
          c.usuarioRepo,
          c.idGenerator,
          c.clock,
          c.emailSender,
          c.webhookPublisher,
          c.logger,
        ),
    ).singleton(),
    registrarNotaService: asFunction(
      (c: Cradle) =>
        new RegistrarNotaService(c.ticketRepo, c.idGenerator, c.clock, c.emailSender, c.logger),
    ).singleton(),
    marcarFacturacionService: asFunction(
      (c: Cradle) =>
        new MarcarFacturacionService(c.ticketRepo, c.idGenerator, c.clock, c.webhookPublisher),
    ).singleton(),
    listarTicketsService: asFunction(
      (c: Cradle) => new ListarTicketsService(c.ticketQueries, c.configuracionRepo),
    ).singleton(),
    verTicketService: asFunction(
      (c: Cradle) => new VerTicketService(c.ticketRepo, c.configuracionRepo),
    ).singleton(),
    panelCargaAgentesService: asFunction(
      (c: Cradle) => new PanelCargaAgentesService(c.ticketQueries, c.usuarioRepo, c.clock),
    ).singleton(),
    crearTicketPublicoService: asFunction(
      (c: Cradle) =>
        new CrearTicketPublicoService(
          c.ticketPublicoRepo,
          c.configuracionRepo,
          c.captchaVerifier,
          c.emailSender,
          c.clock,
          c.logger,
        ),
    ).singleton(),
    gestionTicketPublicoService: asFunction(
      (c: Cradle) =>
        new GestionTicketPublicoService(c.ticketPublicoRepo, c.crearTicketService, c.logger),
    ).singleton(),
    configuracionTicketsService: asFunction(
      (c: Cradle) => new ConfiguracionTicketsService(c.configuracionRepo, c.logger),
    ).singleton(),

    authController: asFunction(
      (c: Cradle) =>
        new AuthController(
          c.loginService,
          c.solicitarAccesoService,
          c.aceptarInvitacionService,
          c.invitacionRepo,
          { notificarSolicitudesA: [c.config.brevo.senderEmail], cookieSecure: c.config.isProduction },
        ),
    ).singleton(),
    usuarioController: asFunction(
      (c: Cradle) =>
        new UsuarioController(
          c.usuarioRepo,
          c.crearUsuarioService,
          c.actualizarUsuarioService,
          c.invitarClienteService,
        ),
    ).singleton(),
    portalPerfilController: asFunction(
      (c: Cradle) => new PortalPerfilController(c.usuarioRepo, c.actualizarMiPerfilService),
    ).singleton(),
    ticketController: asFunction(
      (c: Cradle) =>
        new TicketController(
          c.crearTicketService,
          c.actualizarEstadoTicketService,
          c.asignarAgenteService,
          c.registrarNotaService,
          c.marcarFacturacionService,
          c.listarTicketsService,
          c.verTicketService,
          c.panelCargaAgentesService,
          c.gestionTicketPublicoService,
          c.ticketPublicoRepo,
          c.usuarioRepo,
          c.clock,
        ),
    ).singleton(),
    configuracionController: asFunction(
      (c: Cradle) => new ConfiguracionController(c.configuracionTicketsService),
    ).singleton(),
    ticketPublicoController: asFunction(
      (c: Cradle) =>
        new TicketPublicoController(
          c.crearTicketPublicoService,
          c.configuracionRepo,
          c.config.turnstile.siteKey,
        ),
    ).singleton(),
    brevoWebhookController: asFunction(
      (c: Cradle) => new BrevoWebhookController(c.config.jobs.secret, c.logger),
    ).singleton(),
  });

  for (const [nombre, valor] of Object.entries(overrides)) {
    container.register({ [nombre]: asValue(valor) });
  }

  return container;
}
