import { asFunction, asValue, createContainer, InjectionMode, type AwilixContainer } from 'awilix';
import type { Firestore } from 'firebase-admin/firestore';
import type { AppConfig } from './env.js';
import { initFirebase, type FirebaseServices } from './firebase.js';
import { resolverDriverFirestore, type DriverFirestore } from './firestoreDriver.js';
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
import { SmtpEmailSender } from '../infrastructure/email/SmtpEmailSender.js';
import { FirestoreTicketRepository } from '../infrastructure/firestore/FirestoreTicketRepository.js';
import { FirestoreTicketQueries } from '../infrastructure/firestore/FirestoreTicketQueries.js';
import { FirestoreContadorRepository } from '../infrastructure/firestore/FirestoreContadorRepository.js';
import { FirestoreIntentosLoginRepository } from '../infrastructure/firestore/FirestoreIntentosLoginRepository.js';
import { FirestoreFiltroGuardadoRepository } from '../infrastructure/firestore/FirestoreFiltroGuardadoRepository.js';
import { FiltrosGuardadosService } from '../application/shared/FiltrosGuardadosService.js';
import { FiltrosController } from '../interfaces/http/controllers/backoffice/FiltrosController.js';
import { FirestoreConfiguracionRepository } from '../infrastructure/firestore/FirestoreConfiguracionRepository.js';
import { FirestoreTicketPublicoRepository } from '../infrastructure/firestore/FirestoreTicketPublicoRepository.js';
import { FirestoreEmpresaRepository } from '../infrastructure/firestore/FirestoreEmpresaRepository.js';
import { FirestoreContactoRepository } from '../infrastructure/firestore/FirestoreContactoRepository.js';
import { FirestoreBitacoraRepository } from '../infrastructure/firestore/FirestoreBitacoraRepository.js';
import { FirestoreVersionRepository } from '../infrastructure/firestore/FirestoreVersionRepository.js';
import { FirestoreKnowledgeRepository } from '../infrastructure/firestore/FirestoreKnowledgeRepository.js';
import { FirestoreCotizacionRepository } from '../infrastructure/firestore/FirestoreCotizacionRepository.js';
import {
  FirestoreInteraccionRepository,
  FirestoreTareaRepository,
} from '../infrastructure/firestore/FirestoreSeguimientoRepository.js';
import {
  FirestoreEventoRepository,
  FirestoreInscripcionRepository,
  FirestoreListaNegraRepository,
} from '../infrastructure/firestore/FirestoreEventoRepository.js';
import { N8nWebhookPublisher } from '../infrastructure/webhooks/N8nWebhookPublisher.js';
import { HttpIntegracionesGateway } from '../infrastructure/integraciones/HttpIntegracionesGateway.js';
import { ExceljsExcelIO } from '../infrastructure/excel/ExceljsExcelIO.js';
import { TurnstileVerifier, NullCaptchaVerifier } from '../infrastructure/captcha/TurnstileVerifier.js';
import { LoginService } from '../application/auth/LoginService.js';
import { SolicitarAccesoService } from '../application/auth/SolicitarAccesoService.js';
import { CrearUsuarioService } from '../application/usuarios/CrearUsuarioService.js';
import { ActualizarUsuarioService } from '../application/usuarios/ActualizarUsuarioService.js';
import { ActualizarMiFirmaService } from '../application/usuarios/ActualizarMiFirmaService.js';
import { InvitarClienteService } from '../application/usuarios/InvitarClienteService.js';
import { AceptarInvitacionService } from '../application/usuarios/AceptarInvitacionService.js';
import { ActualizarMiPerfilService } from '../application/portal/ActualizarMiPerfilService.js';
import { CrearTicketPortalService } from '../application/portal/CrearTicketPortalService.js';
import { MisTicketsService } from '../application/portal/MisTicketsService.js';
import { ResponderMiTicketService } from '../application/portal/ResponderMiTicketService.js';
import { CrearTicketService } from '../application/tickets/CrearTicketService.js';
import { ActualizarEstadoTicketService } from '../application/tickets/ActualizarEstadoTicketService.js';
import { AsignarAgenteService } from '../application/tickets/AsignarAgenteService.js';
import { RegistrarNotaService } from '../application/tickets/RegistrarNotaService.js';
import { MarcarFacturacionService } from '../application/tickets/MarcarFacturacionService.js';
import { ProgramarAtencionService } from '../application/tickets/ProgramarAtencionService.js';
import { AjustarTiempoService } from '../application/tickets/AjustarTiempoService.js';
import { ArchivarTicketService } from '../application/tickets/ArchivarTicketService.js';
import { ListarTicketsService } from '../application/tickets/ListarTicketsService.js';
import { VerTicketService } from '../application/tickets/VerTicketService.js';
import { PanelCargaAgentesService } from '../application/tickets/PanelCargaAgentesService.js';
import { CrearTicketPublicoService } from '../application/tickets/CrearTicketPublicoService.js';
import { GestionTicketPublicoService } from '../application/tickets/GestionTicketPublicoService.js';
import { ConfiguracionTicketsService } from '../application/configuracion/ConfiguracionTicketsService.js';
import { AcercaDeService } from '../application/configuracion/AcercaDeService.js';
import { ConfiguracionIntegracionesService } from '../application/configuracion/ConfiguracionIntegracionesService.js';
import { BitacoraService } from '../application/shared/BitacoraService.js';
import { EmpresaService } from '../application/empresas/EmpresaService.js';
import { EmpresaExcelService } from '../application/empresas/EmpresaExcelService.js';
import { ContactoService } from '../application/contactos/ContactoService.js';
import { ContactoExcelService } from '../application/contactos/ContactoExcelService.js';
import { TicketExcelService } from '../application/tickets/TicketExcelService.js';
import { VersionService } from '../application/versiones/VersionService.js';
import { KnowledgeService } from '../application/knowledge/KnowledgeService.js';
import { CotizacionService } from '../application/cotizaciones/CotizacionService.js';
import { CalculadoraCompacService } from '../application/cotizaciones/CalculadoraCompacService.js';
import { SeguimientoService } from '../application/seguimiento/SeguimientoService.js';
import { EventoService } from '../application/eventos/EventoService.js';
import { ObtenerMetricasService } from '../application/dashboard/ObtenerMetricasService.js';
import { AuthController } from '../interfaces/http/controllers/public/AuthController.js';
import { UsuarioController } from '../interfaces/http/controllers/backoffice/UsuarioController.js';
import { PortalPerfilController } from '../interfaces/http/controllers/portal/PortalPerfilController.js';
import { PortalTicketController } from '../interfaces/http/controllers/portal/PortalTicketController.js';
import { TicketController } from '../interfaces/http/controllers/backoffice/TicketController.js';
import { ConfiguracionController } from '../interfaces/http/controllers/backoffice/ConfiguracionController.js';
import { BackupService } from '../application/configuracion/BackupService.js';
import { TicketPublicoController } from '../interfaces/http/controllers/public/TicketPublicoController.js';
import { BrevoWebhookController } from '../interfaces/http/controllers/webhooks/BrevoWebhookController.js';
import { EmpresaController } from '../interfaces/http/controllers/backoffice/EmpresaController.js';
import { AvisarEmpresasService } from '../application/empresas/AvisarEmpresasService.js';
import { ContactoController } from '../interfaces/http/controllers/backoffice/ContactoController.js';
import { BitacoraController } from '../interfaces/http/controllers/backoffice/BitacoraController.js';
import { VersionController } from '../interfaces/http/controllers/backoffice/VersionController.js';
import { KnowledgeController } from '../interfaces/http/controllers/KnowledgeController.js';
import { BusquedaGlobalService } from '../application/shared/BusquedaGlobalService.js';
import { BusquedaController } from '../interfaces/http/controllers/backoffice/BusquedaController.js';
import { CotizacionController } from '../interfaces/http/controllers/backoffice/CotizacionController.js';
import { SeguimientoController } from '../interfaces/http/controllers/backoffice/SeguimientoController.js';
import { PapeleraController } from '../interfaces/http/controllers/backoffice/PapeleraController.js';
import { PapeleraService } from '../application/papelera/PapeleraService.js';
import { EventoController } from '../interfaces/http/controllers/backoffice/EventoController.js';
import { EventoPublicoController } from '../interfaces/http/controllers/public/EventoPublicoController.js';
import { JobsController } from '../interfaces/http/controllers/webhooks/JobsController.js';
import { DashboardController } from '../interfaces/http/controllers/backoffice/DashboardController.js';
import { SESSION_COOKIE_MAX_AGE_MS, SESSION_IDLE_MAX_AGE_MS } from './constants.js';
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
import type { IIntentosLoginRepository } from '../core/ports/repositories/IIntentosLoginRepository.js';
import type { IFiltroGuardadoRepository } from '../core/ports/repositories/IFiltroGuardadoRepository.js';
import type { IConfiguracionRepository } from '../core/ports/repositories/IConfiguracionRepository.js';
import type { ITicketPublicoRepository } from '../core/ports/repositories/ITicketPublicoRepository.js';
import type { IWebhookPublisher } from '../core/ports/services/IWebhookPublisher.js';
import type { ICaptchaVerifier } from '../core/ports/services/ICaptchaVerifier.js';
import type { IIntegracionesGateway } from '../core/ports/services/IIntegracionesGateway.js';
import type { IExcelIO } from '../core/ports/services/IExcelIO.js';
import type { IEmpresaRepository } from '../core/ports/repositories/IEmpresaRepository.js';
import type { IContactoRepository } from '../core/ports/repositories/IContactoRepository.js';
import type { IBitacoraRepository } from '../core/ports/repositories/IBitacoraRepository.js';
import type { IVersionRepository } from '../core/ports/repositories/IVersionRepository.js';
import type { IKnowledgeRepository } from '../core/ports/repositories/IKnowledgeRepository.js';
import type { ICotizacionRepository } from '../core/ports/repositories/ICotizacionRepository.js';
import type {
  IInteraccionRepository,
  ITareaRepository,
} from '../core/ports/repositories/ISeguimientoRepository.js';
import type {
  IEventoRepository,
  IInscripcionRepository,
  IListaNegraRepository,
} from '../core/ports/repositories/IEventoRepository.js';

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
  /** Acceso a Firestore según el driver activo (admin SDK o cliente REST). */
  firestoreDb: Firestore | null;

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
  intentosLoginRepo: IIntentosLoginRepository;
  filtroGuardadoRepo: IFiltroGuardadoRepository;
  filtrosGuardadosService: FiltrosGuardadosService;
  filtrosController: FiltrosController;
  configuracionRepo: IConfiguracionRepository;
  ticketPublicoRepo: ITicketPublicoRepository;
  webhookPublisher: IWebhookPublisher;
  integracionesGateway: IIntegracionesGateway;
  excelIO: IExcelIO;
  captchaVerifier: ICaptchaVerifier;
  empresaRepo: IEmpresaRepository;
  contactoRepo: IContactoRepository;
  bitacoraRepo: IBitacoraRepository;
  versionRepo: IVersionRepository;
  knowledgeRepo: IKnowledgeRepository;
  cotizacionRepo: ICotizacionRepository;
  interaccionRepo: IInteraccionRepository;
  tareaRepo: ITareaRepository;
  eventoRepo: IEventoRepository;
  inscripcionRepo: IInscripcionRepository;
  listaNegraRepo: IListaNegraRepository;

  // Casos de uso
  loginService: LoginService;
  solicitarAccesoService: SolicitarAccesoService;
  crearUsuarioService: CrearUsuarioService;
  actualizarUsuarioService: ActualizarUsuarioService;
  actualizarMiFirmaService: ActualizarMiFirmaService;
  invitarClienteService: InvitarClienteService;
  aceptarInvitacionService: AceptarInvitacionService;
  actualizarMiPerfilService: ActualizarMiPerfilService;
  crearTicketPortalService: CrearTicketPortalService;
  misTicketsService: MisTicketsService;
  responderMiTicketService: ResponderMiTicketService;
  crearTicketService: CrearTicketService;
  actualizarEstadoTicketService: ActualizarEstadoTicketService;
  asignarAgenteService: AsignarAgenteService;
  registrarNotaService: RegistrarNotaService;
  marcarFacturacionService: MarcarFacturacionService;
  programarAtencionService: ProgramarAtencionService;
  ajustarTiempoService: AjustarTiempoService;
  archivarTicketService: ArchivarTicketService;
  listarTicketsService: ListarTicketsService;
  verTicketService: VerTicketService;
  panelCargaAgentesService: PanelCargaAgentesService;
  crearTicketPublicoService: CrearTicketPublicoService;
  gestionTicketPublicoService: GestionTicketPublicoService;
  configuracionTicketsService: ConfiguracionTicketsService;
  configuracionIntegracionesService: ConfiguracionIntegracionesService;
  acercaDeService: AcercaDeService;
  bitacoraService: BitacoraService;
  empresaService: EmpresaService;
  avisarEmpresasService: AvisarEmpresasService;
  empresaExcelService: EmpresaExcelService;
  contactoService: ContactoService;
  contactoExcelService: ContactoExcelService;
  ticketExcelService: TicketExcelService;
  versionService: VersionService;
  knowledgeService: KnowledgeService;
  cotizacionService: CotizacionService;
  calculadoraCompacService: CalculadoraCompacService;
  seguimientoService: SeguimientoService;
  eventoService: EventoService;
  obtenerMetricasService: ObtenerMetricasService;

  // Controllers
  authController: AuthController;
  usuarioController: UsuarioController;
  portalPerfilController: PortalPerfilController;
  portalTicketController: PortalTicketController;
  ticketController: TicketController;
  configuracionController: ConfiguracionController;
  backupService: BackupService;
  ticketPublicoController: TicketPublicoController;
  brevoWebhookController: BrevoWebhookController;
  empresaController: EmpresaController;
  contactoController: ContactoController;
  bitacoraController: BitacoraController;
  versionController: VersionController;
  knowledgeController: KnowledgeController;
  busquedaGlobalService: BusquedaGlobalService;
  busquedaController: BusquedaController;
  cotizacionController: CotizacionController;
  seguimientoController: SeguimientoController;
  papeleraService: PapeleraService;
  papeleraController: PapeleraController;
  eventoController: EventoController;
  eventoPublicoController: EventoPublicoController;
  jobsController: JobsController;
  dashboardController: DashboardController;
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

function requireFirestore(db: Firestore | null): Firestore {
  if (!db) {
    throw new Error(
      'No hay acceso a Firestore (DISABLE_FIREBASE=true, o falta configuración del driver).',
    );
  }
  return db;
}

/** Composition root: único lugar donde se instancian adaptadores concretos. */
export function buildContainer(config: AppConfig, overrides: ContainerOverrides = {}): Container {
  const container = createContainer<Cradle>({ injectionMode: InjectionMode.PROXY, strict: true });

  // El logger se resuelve primero: lo usan `resolverDriverFirestore`/`initFirebase` antes
  // de que se apliquen los overrides genéricos (al final). `main.worker.ts` inyecta un
  // `ConsoleLogger` porque pino no corre en Cloudflare Workers.
  const logger =
    overrides.logger ??
    PinoLogger.create({
      level: config.logLevel,
      pretty: !config.isProduction && !config.isTest,
    });

  // Driver de datos: `rest` (Cloudflare Workers) o `admin` (firebase-admin, por defecto).
  const driverRest: DriverFirestore | null = resolverDriverFirestore(config, logger);
  const firebase = driverRest ? null : initFirebase(config, logger);
  const firestoreDb: Firestore | null = driverRest?.firestore ?? firebase?.firestore ?? null;

  container.register({
    config: asValue(config),
    logger: asValue(logger),
    clock: asFunction(() => new SystemClock()).singleton(),
    idGenerator: asFunction(() => new UuidGenerator()).singleton(),
    firebase: asValue(firebase),
    firestoreDb: asValue(firestoreDb),

    authProvider: asFunction(
      ({ firebase: fb, config: c, logger: l }: Cradle): IAuthProvider =>
        driverRest?.authProvider ??
        new FirebaseAuthProvider(requireFirebase(fb).auth, {
          apiKey: c.firebase.apiKey,
          emulatorHost: c.firebase.authEmulatorHost || process.env.FIREBASE_AUTH_EMULATOR_HOST || '',
        }, l),
    ).singleton(),

    sessionManager: asFunction(
      ({ config: c }: Cradle): ISessionManager =>
        new SignedCookieSessionManager(
          c.session.secret,
          SESSION_COOKIE_MAX_AGE_MS,
          SESSION_IDLE_MAX_AGE_MS,
        ),
    ).singleton(),

    emailSender: asFunction(({ config: c, logger: l }: Cradle): IEmailSender => {
      if (c.smtp.host) {
        return new SmtpEmailSender(
          {
            host: c.smtp.host,
            port: c.smtp.port,
            secure: c.smtp.secure,
            user: c.smtp.user,
            pass: c.smtp.pass,
            senderName: c.brevo.senderName,
            senderEmail: c.brevo.senderEmail,
          },
          l,
        );
      }
      if (c.brevo.apiKey) {
        return new BrevoEmailSender(
          { apiKey: c.brevo.apiKey, senderName: c.brevo.senderName, senderEmail: c.brevo.senderEmail },
          l,
        );
      }
      return new LoggingEmailSender(l);
    }).singleton(),

    usuarioRepo: asFunction(
      ({ firestoreDb }: Cradle): IUsuarioRepository =>
        new FirestoreUsuarioRepository(requireFirestore(firestoreDb)),
    ).singleton(),
    solicitudAccesoRepo: asFunction(
      ({ firestoreDb }: Cradle): ISolicitudAccesoRepository =>
        new FirestoreSolicitudAccesoRepository(requireFirestore(firestoreDb)),
    ).singleton(),
    invitacionRepo: asFunction(
      ({ firestoreDb }: Cradle): IInvitacionRepository =>
        new FirestoreInvitacionRepository(requireFirestore(firestoreDb)),
    ).singleton(),
    ticketRepo: asFunction(
      ({ firestoreDb }: Cradle): ITicketRepository =>
        new FirestoreTicketRepository(requireFirestore(firestoreDb)),
    ).singleton(),
    ticketQueries: asFunction(
      ({ firestoreDb }: Cradle): ITicketQueries =>
        new FirestoreTicketQueries(requireFirestore(firestoreDb)),
    ).singleton(),
    contadorRepo: asFunction(
      ({ firestoreDb }: Cradle): IContadorRepository =>
        new FirestoreContadorRepository(requireFirestore(firestoreDb)),
    ).singleton(),
    intentosLoginRepo: asFunction(
      ({ firestoreDb }: Cradle): IIntentosLoginRepository =>
        new FirestoreIntentosLoginRepository(requireFirestore(firestoreDb)),
    ).singleton(),
    filtroGuardadoRepo: asFunction(
      ({ firestoreDb }: Cradle): IFiltroGuardadoRepository =>
        new FirestoreFiltroGuardadoRepository(requireFirestore(firestoreDb)),
    ).singleton(),
    filtrosGuardadosService: asFunction(
      (c: Cradle) => new FiltrosGuardadosService(c.filtroGuardadoRepo, c.idGenerator, c.clock),
    ).singleton(),
    filtrosController: asFunction((c: Cradle) => new FiltrosController(c.filtrosGuardadosService)).singleton(),
    configuracionRepo: asFunction(
      ({ firestoreDb }: Cradle): IConfiguracionRepository =>
        new FirestoreConfiguracionRepository(requireFirestore(firestoreDb)),
    ).singleton(),
    ticketPublicoRepo: asFunction(
      ({ firestoreDb }: Cradle): ITicketPublicoRepository =>
        new FirestoreTicketPublicoRepository(requireFirestore(firestoreDb)),
    ).singleton(),
    integracionesGateway: asFunction((): IIntegracionesGateway => new HttpIntegracionesGateway()).singleton(),
    excelIO: asFunction((): IExcelIO => new ExceljsExcelIO()).singleton(),
    webhookPublisher: asFunction(
      ({ config: c, configuracionRepo, integracionesGateway, logger: l }: Cradle): IWebhookPublisher =>
        new N8nWebhookPublisher(
          integracionesGateway,
          configuracionRepo,
          { tickets: c.n8n.ticketsWebhook, cotizaciones: c.n8n.cotizacionesWebhook },
          l,
        ),
    ).singleton(),
    captchaVerifier: asFunction(({ config: c, logger: l }: Cradle): ICaptchaVerifier =>
      c.turnstile.secret ? new TurnstileVerifier(c.turnstile.secret, l) : new NullCaptchaVerifier(),
    ).singleton(),
    empresaRepo: asFunction(
      ({ firestoreDb }: Cradle): IEmpresaRepository =>
        new FirestoreEmpresaRepository(requireFirestore(firestoreDb)),
    ).singleton(),
    contactoRepo: asFunction(
      ({ firestoreDb }: Cradle): IContactoRepository =>
        new FirestoreContactoRepository(requireFirestore(firestoreDb)),
    ).singleton(),
    bitacoraRepo: asFunction(
      ({ firestoreDb }: Cradle): IBitacoraRepository =>
        new FirestoreBitacoraRepository(requireFirestore(firestoreDb)),
    ).singleton(),
    versionRepo: asFunction(
      ({ firestoreDb }: Cradle): IVersionRepository =>
        new FirestoreVersionRepository(requireFirestore(firestoreDb)),
    ).singleton(),
    knowledgeRepo: asFunction(
      ({ firestoreDb }: Cradle): IKnowledgeRepository =>
        new FirestoreKnowledgeRepository(requireFirestore(firestoreDb)),
    ).singleton(),
    cotizacionRepo: asFunction(
      ({ firestoreDb }: Cradle): ICotizacionRepository =>
        new FirestoreCotizacionRepository(requireFirestore(firestoreDb)),
    ).singleton(),
    interaccionRepo: asFunction(
      ({ firestoreDb }: Cradle): IInteraccionRepository =>
        new FirestoreInteraccionRepository(requireFirestore(firestoreDb)),
    ).singleton(),
    tareaRepo: asFunction(
      ({ firestoreDb }: Cradle): ITareaRepository =>
        new FirestoreTareaRepository(requireFirestore(firestoreDb)),
    ).singleton(),
    eventoRepo: asFunction(
      ({ firestoreDb }: Cradle): IEventoRepository =>
        new FirestoreEventoRepository(requireFirestore(firestoreDb)),
    ).singleton(),
    inscripcionRepo: asFunction(
      ({ firestoreDb }: Cradle): IInscripcionRepository =>
        new FirestoreInscripcionRepository(requireFirestore(firestoreDb)),
    ).singleton(),
    listaNegraRepo: asFunction(
      ({ firestoreDb }: Cradle): IListaNegraRepository =>
        new FirestoreListaNegraRepository(requireFirestore(firestoreDb)),
    ).singleton(),

    loginService: asFunction(
      (c: Cradle) =>
        new LoginService(
          c.usuarioRepo,
          c.authProvider,
          c.sessionManager,
          c.clock,
          c.logger,
          c.intentosLoginRepo,
        ),
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
    actualizarMiFirmaService: asFunction(
      (c: Cradle) => new ActualizarMiFirmaService(c.usuarioRepo, c.clock),
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
    crearTicketPortalService: asFunction(
      (c: Cradle) => new CrearTicketPortalService(c.crearTicketService),
    ).singleton(),
    misTicketsService: asFunction(
      (c: Cradle) => new MisTicketsService(c.ticketQueries, c.ticketRepo, c.configuracionRepo),
    ).singleton(),
    responderMiTicketService: asFunction(
      (c: Cradle) =>
        new ResponderMiTicketService(
          c.ticketRepo,
          c.usuarioRepo,
          c.idGenerator,
          c.clock,
          c.emailSender,
          c.logger,
        ),
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
    programarAtencionService: asFunction(
      (c: Cradle) =>
        new ProgramarAtencionService(c.ticketRepo, c.idGenerator, c.clock, c.webhookPublisher),
    ).singleton(),
    ajustarTiempoService: asFunction(
      (c: Cradle) => new AjustarTiempoService(c.ticketRepo, c.idGenerator, c.clock),
    ).singleton(),
    archivarTicketService: asFunction(
      (c: Cradle) => new ArchivarTicketService(c.ticketRepo, c.idGenerator, c.clock),
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
    configuracionIntegracionesService: asFunction(
      (c: Cradle) =>
        new ConfiguracionIntegracionesService(c.configuracionRepo, c.integracionesGateway, c.logger),
    ).singleton(),
    acercaDeService: asFunction(
      (c: Cradle) => new AcercaDeService(c.configuracionRepo, c.logger),
    ).singleton(),
    bitacoraService: asFunction(
      (c: Cradle) => new BitacoraService(c.bitacoraRepo, c.idGenerator, c.clock, c.logger),
    ).singleton(),
    empresaService: asFunction(
      (c: Cradle) => new EmpresaService(c.empresaRepo, c.idGenerator, c.clock, c.bitacoraService),
    ).singleton(),
    avisarEmpresasService: asFunction(
      (c: Cradle) =>
        new AvisarEmpresasService(
          c.empresaRepo,
          c.contactoRepo,
          c.versionRepo,
          c.configuracionRepo,
          c.emailSender,
          c.bitacoraService,
          c.clock,
        ),
    ).singleton(),
    empresaExcelService: asFunction(
      (c: Cradle) => new EmpresaExcelService(c.empresaService, c.excelIO),
    ).singleton(),
    contactoService: asFunction(
      (c: Cradle) =>
        new ContactoService(c.contactoRepo, c.empresaRepo, c.idGenerator, c.clock, c.bitacoraService),
    ).singleton(),
    contactoExcelService: asFunction(
      (c: Cradle) => new ContactoExcelService(c.contactoService, c.empresaService, c.excelIO),
    ).singleton(),
    ticketExcelService: asFunction(
      (c: Cradle) => new TicketExcelService(c.ticketQueries, c.excelIO),
    ).singleton(),
    versionService: asFunction(
      (c: Cradle) => new VersionService(c.versionRepo, c.idGenerator, c.clock, c.bitacoraService),
    ).singleton(),
    knowledgeService: asFunction(
      (c: Cradle) => new KnowledgeService(c.knowledgeRepo, c.idGenerator, c.clock, c.bitacoraService),
    ).singleton(),
    cotizacionService: asFunction(
      (c: Cradle) =>
        new CotizacionService(
          c.cotizacionRepo,
          c.contadorRepo,
          c.empresaRepo,
          c.idGenerator,
          c.clock,
          c.bitacoraService,
          c.webhookPublisher,
          c.contactoRepo,
          c.emailSender,
          c.crearTicketService,
          c.config.baseUrl,
        ),
    ).singleton(),
    calculadoraCompacService: asFunction(
      (c: Cradle) => new CalculadoraCompacService(c.configuracionRepo),
    ).singleton(),
    seguimientoService: asFunction(
      (c: Cradle) =>
        new SeguimientoService(c.interaccionRepo, c.tareaRepo, c.idGenerator, c.clock, c.bitacoraService),
    ).singleton(),
    eventoService: asFunction(
      (c: Cradle) =>
        new EventoService(
          c.eventoRepo,
          c.inscripcionRepo,
          c.listaNegraRepo,
          c.captchaVerifier,
          c.emailSender,
          c.idGenerator,
          c.clock,
          c.logger,
          c.bitacoraService,
          c.config.baseUrl,
        ),
    ).singleton(),
    obtenerMetricasService: asFunction(
      (c: Cradle) =>
        new ObtenerMetricasService(
          c.ticketQueries,
          c.cotizacionRepo,
          c.eventoRepo,
          c.tareaRepo,
          c.bitacoraRepo,
          c.clock,
          c.empresaRepo,
          c.versionRepo,
        ),
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
          c.empresaRepo,
          c.actualizarMiFirmaService,
        ),
    ).singleton(),
    portalPerfilController: asFunction(
      (c: Cradle) => new PortalPerfilController(c.usuarioRepo, c.actualizarMiPerfilService),
    ).singleton(),
    portalTicketController: asFunction(
      (c: Cradle) =>
        new PortalTicketController(
          c.crearTicketPortalService,
          c.misTicketsService,
          c.responderMiTicketService,
          c.clock,
        ),
    ).singleton(),
    ticketController: asFunction(
      (c: Cradle) =>
        new TicketController(
          c.crearTicketService,
          c.actualizarEstadoTicketService,
          c.asignarAgenteService,
          c.registrarNotaService,
          c.marcarFacturacionService,
          c.programarAtencionService,
          c.ajustarTiempoService,
          c.archivarTicketService,
          c.listarTicketsService,
          c.verTicketService,
          c.panelCargaAgentesService,
          c.gestionTicketPublicoService,
          c.ticketPublicoRepo,
          c.usuarioRepo,
          c.clock,
          c.ticketExcelService,
        ),
    ).singleton(),
    backupService: asFunction(
      (c: Cradle) =>
        new BackupService(
          c.empresaRepo,
          c.contactoRepo,
          c.ticketRepo,
          c.ticketQueries,
          c.cotizacionRepo,
          c.versionRepo,
          c.knowledgeRepo,
          c.usuarioRepo,
          c.configuracionRepo,
          c.contadorRepo,
          c.clock,
        ),
    ).singleton(),
    configuracionController: asFunction(
      (c: Cradle) =>
        new ConfiguracionController(
          c.configuracionTicketsService,
          c.configuracionIntegracionesService,
          c.backupService,
          c.acercaDeService,
        ),
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
      (c: Cradle) => new BrevoWebhookController(c.eventoService, c.config.jobs.secret, c.logger),
    ).singleton(),
    empresaController: asFunction(
      (c: Cradle) =>
        new EmpresaController(
          c.empresaService,
          c.contactoService,
          c.ticketQueries,
          c.seguimientoService,
          c.versionService,
          c.avisarEmpresasService,
          c.empresaExcelService,
          c.filtrosGuardadosService,
        ),
    ).singleton(),
    contactoController: asFunction(
      (c: Cradle) => new ContactoController(c.contactoService, c.empresaService, c.contactoExcelService),
    ).singleton(),
    bitacoraController: asFunction(
      (c: Cradle) => new BitacoraController(c.bitacoraService, c.usuarioRepo, c.clock),
    ).singleton(),
    versionController: asFunction(
      (c: Cradle) => new VersionController(c.versionService, c.configuracionRepo),
    ).singleton(),
    knowledgeController: asFunction(
      (c: Cradle) => new KnowledgeController(c.knowledgeService),
    ).singleton(),
    busquedaGlobalService: asFunction(
      (c: Cradle) => new BusquedaGlobalService(c.empresaRepo, c.contactoRepo, c.ticketQueries, c.knowledgeRepo),
    ).singleton(),
    busquedaController: asFunction(
      (c: Cradle) => new BusquedaController(c.busquedaGlobalService),
    ).singleton(),
    cotizacionController: asFunction(
      (c: Cradle) =>
        new CotizacionController(c.cotizacionService, c.calculadoraCompacService, c.empresaService),
    ).singleton(),
    seguimientoController: asFunction(
      (c: Cradle) => new SeguimientoController(c.seguimientoService, c.usuarioRepo),
    ).singleton(),
    papeleraService: asFunction(
      (c: Cradle) =>
        new PapeleraService(
          c.empresaService,
          c.contactoService,
          c.archivarTicketService,
          c.empresaRepo,
          c.contactoRepo,
          c.ticketRepo,
          c.ticketQueries,
          c.bitacoraService,
          c.logger,
        ),
    ).singleton(),
    papeleraController: asFunction(
      (c: Cradle) =>
        new PapeleraController(
          c.empresaService,
          c.contactoService,
          c.ticketQueries,
          c.papeleraService,
        ),
    ).singleton(),
    eventoController: asFunction((c: Cradle) => new EventoController(c.eventoService)).singleton(),
    dashboardController: asFunction(
      (c: Cradle) => new DashboardController(c.obtenerMetricasService),
    ).singleton(),
    eventoPublicoController: asFunction(
      (c: Cradle) => new EventoPublicoController(c.eventoService, c.config.turnstile.siteKey),
    ).singleton(),
    jobsController: asFunction(
      (c: Cradle) =>
        new JobsController(
          c.eventoService,
          c.ticketRepo,
          c.ticketQueries,
          c.idGenerator,
          c.clock,
          c.logger,
          c.config.jobs.secret,
          c.bitacoraService,
        ),
    ).singleton(),
  });

  for (const [nombre, valor] of Object.entries(overrides)) {
    container.register({ [nombre]: asValue(valor) });
  }

  return container;
}
