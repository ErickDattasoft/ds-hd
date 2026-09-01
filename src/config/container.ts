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
import { LoginService } from '../application/auth/LoginService.js';
import { SolicitarAccesoService } from '../application/auth/SolicitarAccesoService.js';
import { CrearUsuarioService } from '../application/usuarios/CrearUsuarioService.js';
import { ActualizarUsuarioService } from '../application/usuarios/ActualizarUsuarioService.js';
import { InvitarClienteService } from '../application/usuarios/InvitarClienteService.js';
import { AceptarInvitacionService } from '../application/usuarios/AceptarInvitacionService.js';
import { ActualizarMiPerfilService } from '../application/portal/ActualizarMiPerfilService.js';
import { AuthController } from '../interfaces/http/controllers/public/AuthController.js';
import { UsuarioController } from '../interfaces/http/controllers/backoffice/UsuarioController.js';
import { PortalPerfilController } from '../interfaces/http/controllers/portal/PortalPerfilController.js';
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

  // Casos de uso
  loginService: LoginService;
  solicitarAccesoService: SolicitarAccesoService;
  crearUsuarioService: CrearUsuarioService;
  actualizarUsuarioService: ActualizarUsuarioService;
  invitarClienteService: InvitarClienteService;
  aceptarInvitacionService: AceptarInvitacionService;
  actualizarMiPerfilService: ActualizarMiPerfilService;

  // Controllers
  authController: AuthController;
  usuarioController: UsuarioController;
  portalPerfilController: PortalPerfilController;
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
  });

  for (const [nombre, valor] of Object.entries(overrides)) {
    container.register({ [nombre]: asValue(valor) });
  }

  return container;
}
