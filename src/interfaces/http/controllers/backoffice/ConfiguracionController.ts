import type { Request, Response } from 'express';
import type { ConfiguracionTicketsService } from '../../../../application/configuracion/ConfiguracionTicketsService.js';
import { ConfiguracionIntegracionesService } from '../../../../application/configuracion/ConfiguracionIntegracionesService.js';
import {
  SECCIONES_IMPORTACION,
  SECCION_ETIQUETA,
  type MigracionCrmViejoService,
  type ModoImportacion,
  type SeccionImportacion,
} from '../../../../application/migracion/MigracionCrmViejoService.js';
import type { BackupService } from '../../../../application/configuracion/BackupService.js';
import type { AcercaDeService } from '../../../../application/configuracion/AcercaDeService.js';
import type { ConfiguracionCotizacionesService } from '../../../../application/configuracion/ConfiguracionCotizacionesService.js';
import type { ConfiguracionCalculadoraService } from '../../../../application/configuracion/ConfiguracionCalculadoraService.js';
import type { ConfiguracionLogoService } from '../../../../application/configuracion/ConfiguracionLogoService.js';
import type { ResumenDiarioService } from '../../../../application/dashboard/ResumenDiarioService.js';
import type { AdjuntoTicketService } from '../../../../application/tickets/AdjuntoTicketService.js';
import type { CorreoEntranteService } from '../../../../application/tickets/CorreoEntranteService.js';
import type { ExcelUnificadoService } from '../../../../application/excel/ExcelUnificadoService.js';
import {
  ETIQUETAS_EVENTOS,
  WHATSAPP_CLIENTES_POR_DEFECTO,
  destinatariosWhatsAppATexto,
  type ProveedorWhatsAppClientes,
} from '../../../../core/entities/ConfiguracionIntegraciones.js';
import { INFO_APP } from '../../../../core/entities/AcercaDe.js';
import { catalogoFacturacion } from './TicketController.js';
import { respuestasATexto } from '../../../../core/entities/ConfiguracionTickets.js';
import { camposDeError } from '../../support/errores.js';

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

/** Configuración → Tickets (catálogos, SLA, notificaciones del portal), integraciones y backup. */
export class ConfiguracionController {
  constructor(
    private readonly configTickets: ConfiguracionTicketsService,
    private readonly configIntegraciones: ConfiguracionIntegracionesService,
    private readonly backup: BackupService,
    private readonly migracionCrmViejo: MigracionCrmViejoService,
    private readonly acercaDe: AcercaDeService,
    private readonly configCotizaciones: ConfiguracionCotizacionesService,
    private readonly configCalculadora: ConfiguracionCalculadoraService,
    private readonly configLogo: ConfiguracionLogoService,
    private readonly configResumen: ResumenDiarioService,
    private readonly adjuntos: AdjuntoTicketService,
    private readonly excelUnificado: ExcelUnificadoService,
    private readonly correoEntrante: CorreoEntranteService,
  ) {}

  cotizacionesView = async (_req: Request, res: Response): Promise<void> => {
    res.render('pages/backoffice/configuracion/cotizaciones', {
      titulo: 'Configuración de cotizaciones',
      config: await this.configCotizaciones.obtener(),
      errores: {},
      guardado: false,
    });
  };

  private catalogoConceptosDe(b: Record<string, unknown>): { descripcion: string; precioUnitario: number; descuentoPorDefecto: number }[] {
    const desc = ([] as unknown[]).concat(b.catDescripcion ?? []).map(String);
    const precio = ([] as unknown[]).concat(b.catPrecio ?? []).map(String);
    const descuento = ([] as unknown[]).concat(b.catDescuento ?? []).map(String);
    return desc
      .map((descripcion, i) => ({
        descripcion: descripcion.trim(),
        precioUnitario: Number(precio[i]) || 0,
        descuentoPorDefecto: Number(descuento[i]) || 0,
      }))
      .filter((c) => c.descripcion);
  }

  cotizacionesPost = async (req: Request, res: Response): Promise<void> => {
    const b = req.body ?? {};
    try {
      await this.configCotizaciones.actualizar({
        actor: req.user!,
        condicionesPorDefecto: str(b.condicionesPorDefecto),
        emisorCargoPorDefecto: str(b.emisorCargoPorDefecto),
        emisorTelefonoPorDefecto: str(b.emisorTelefonoPorDefecto),
        catalogoConceptos: this.catalogoConceptosDe(b),
      });
      res.render('pages/backoffice/configuracion/cotizaciones', {
        titulo: 'Configuración de cotizaciones',
        config: await this.configCotizaciones.obtener(),
        errores: {},
        guardado: true,
      });
    } catch (err) {
      res.status(422).render('pages/backoffice/configuracion/cotizaciones', {
        titulo: 'Configuración de cotizaciones',
        config: await this.configCotizaciones.obtener(),
        errores: camposDeError(err),
        guardado: false,
      });
    }
  };

  acercaDeView = async (req: Request, res: Response): Promise<void> => {
    const config = await this.acercaDe.obtener();
    res.render('pages/backoffice/acerca-de', {
      titulo: 'Acerca de',
      info: INFO_APP,
      config,
      puedeEditar: req.user!.permisos.includes('configuracion:catalogos'),
      errores: {},
      guardado: false,
    });
  };

  acercaDePost = async (req: Request, res: Response): Promise<void> => {
    const b = req.body ?? {};
    try {
      await this.acercaDe.actualizar({
        actor: req.user!,
        version: str(b.version),
        ultimaActualizacion: str(b.ultimaActualizacion),
        notas: str(b.notas),
      });
      res.render('pages/backoffice/acerca-de', {
        titulo: 'Acerca de',
        info: INFO_APP,
        config: await this.acercaDe.obtener(),
        puedeEditar: true,
        errores: {},
        guardado: true,
      });
    } catch (err) {
      res.status(422).render('pages/backoffice/acerca-de', {
        titulo: 'Acerca de',
        info: INFO_APP,
        config: await this.acercaDe.obtener(),
        puedeEditar: req.user!.permisos.includes('configuracion:catalogos'),
        errores: camposDeError(err),
        guardado: false,
      });
    }
  };

  backupView = async (_req: Request, res: Response): Promise<void> => {
    res.render('pages/backoffice/configuracion/backup', {
      titulo: 'Backup',
      cuotaAdjuntos: await this.adjuntos.cuotaEspacio(),
      secciones: SECCIONES_IMPORTACION.map((clave) => ({ clave, etiqueta: SECCION_ETIQUETA[clave] })),
    });
  };

  backupDescargar = async (_req: Request, res: Response): Promise<void> => {
    const datos = await this.backup.exportar();
    const fecha = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Disposition', `attachment; filename="ds-hd-backup-${fecha}.json"`);
    res.type('application/json').send(JSON.stringify(datos, null, 2));
  };

  /** El archivo llega como JSON crudo en el body (lo sube el JS del navegador con `fetch`,
   * no un `<input type=file>` con envío normal — así no hace falta multer). */
  backupRestaurarPost = async (req: Request, res: Response): Promise<void> => {
    try {
      const resumen = await this.backup.restaurar(req.user!, req.body ?? {});
      res.json({ ok: true, resumen });
    } catch (err) {
      res.status(422).json({ ok: false, error: err instanceof Error ? err.message : 'No se pudo restaurar' });
    }
  };

  /**
   * Importa un respaldo del CRM viejo desde la UI (mismo motor que `scripts/migrate`). El
   * archivo llega como JSON crudo en el body, igual que la restauración de backups.
   */
  importarCrmViejoPost = async (req: Request, res: Response): Promise<void> => {
    const modo: ModoImportacion = req.query.modo === 'sustituir' ? 'sustituir' : 'actualizar';
    const simulacro = req.query.simulacro === '1';
    // `?secciones=tickets,empresas`. Sin el parámetro se traen todas, que es como se comportaba
    // antes de que la pantalla ofreciera marcarlas una por una.
    const pedidas = String(req.query.secciones ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const secciones: SeccionImportacion[] = pedidas.length
      ? SECCIONES_IMPORTACION.filter((s) => pedidas.includes(s))
      : [...SECCIONES_IMPORTACION];
    try {
      const resultado = await this.migracionCrmViejo.importar(req.user!, req.body ?? {}, {
        modo,
        simulacro,
        secciones,
      });
      res.json({ ok: true, resultado });
    } catch (err) {
      res.status(422).json({ ok: false, error: err instanceof Error ? err.message : 'No se pudo importar' });
    }
  };

  excelView = (_req: Request, res: Response): void => {
    res.render('pages/backoffice/configuracion/excel', { titulo: 'Excel unificado' });
  };

  excelExportarPost = async (req: Request, res: Response): Promise<void> => {
    const b = req.body ?? {};
    try {
      const buffer = await this.excelUnificado.exportar(req.user!, {
        empresas: b.empresas === 'on',
        contactos: b.contactos === 'on',
        tickets: b.tickets === 'on',
      });
      const fecha = new Date().toISOString().slice(0, 10);
      res.setHeader('Content-Disposition', `attachment; filename="ds-hd-excel-${fecha}.xlsx"`);
      res.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet').send(buffer);
    } catch (err) {
      res.status(422).render('pages/backoffice/configuracion/excel', {
        titulo: 'Excel unificado',
        errores: camposDeError(err),
      });
    }
  };

  /** El archivo llega por `fetch` con `FormData` — mismo patrón que empresas/contactos. */
  excelImportarPost = async (req: Request, res: Response): Promise<void> => {
    const archivo = req.file;
    if (!archivo) {
      res.status(422).json({ ok: false, error: 'Selecciona un archivo .xlsx' });
      return;
    }
    try {
      const resultado = await this.excelUnificado.importar(req.user!, archivo.buffer);
      res.json({ ok: true, resultado });
    } catch (err) {
      res.status(422).json({ ok: false, error: err instanceof Error ? err.message : 'No se pudo importar el archivo' });
    }
  };

  ticketsView = async (_req: Request, res: Response): Promise<void> => {
    const config = await this.configTickets.obtener();
    res.render('pages/backoffice/configuracion/tickets', {
      estadosFacturacion: catalogoFacturacion(),
      respuestasATexto,
      titulo: 'Configuración de tickets',
      config,
      errores: {},
      guardado: false,
    });
  };

  ticketsPost = async (req: Request, res: Response): Promise<void> => {
    const b = req.body ?? {};
    const slaHoras: Record<string, string> = {};
    for (const [k, v] of Object.entries(b)) {
      if (k.startsWith('sla_')) slaHoras[k.slice(4)] = String(v);
    }
    try {
      await this.configTickets.actualizar({
        actor: req.user!,
        tipos: str(b.tipos),
        sistemas: str(b.sistemas),
        grupos: str(b.grupos),
        estados: str(b.estados),
        prioridades: str(b.prioridades),
        tiposFacturables: str(b.tiposFacturables),
        estadoInicial: str(b.estadoInicial),
        correosNotificacion: str(b.correosNotificacion),
        slaHoras,
        respuestas: str(b.respuestas),
        avisarClienteEstados: ([] as string[]).concat((b.avisarClienteEstados as string[]) ?? []).filter(Boolean),
        predeterminados: {
          tipo: str(b.predTipo),
          prioridad: str(b.predPrioridad),
          sistema: str(b.predSistema),
          grupo: str(b.predGrupo),
          estadoFacturacion: str(b.predFacturacion),
          asignarAlCreador: b.predAsignarAlCreador === 'on',
        },
      });
      const config = await this.configTickets.obtener();
      res.render('pages/backoffice/configuracion/tickets', {
      estadosFacturacion: catalogoFacturacion(),
      respuestasATexto,
        titulo: 'Configuración de tickets',
        config,
        errores: {},
        guardado: true,
      });
    } catch (err) {
      const config = await this.configTickets.obtener();
      res.status(422).render('pages/backoffice/configuracion/tickets', {
      estadosFacturacion: catalogoFacturacion(),
      respuestasATexto,
        titulo: 'Configuración de tickets',
        config,
        errores: camposDeError(err),
        guardado: false,
      });
    }
  };

  private async renderIntegraciones(
    res: Response,
    opts: { status?: number; errores?: Record<string, string>; guardado?: boolean } = {},
  ): Promise<void> {
    const config = await this.configIntegraciones.obtener();
    res.status(opts.status ?? 200).render('pages/backoffice/configuracion/integraciones', {
      titulo: 'Integraciones',
      config,
      whatsappOtrosTexto: destinatariosWhatsAppATexto(config.whatsappOtros),
      wa: { ...WHATSAPP_CLIENTES_POR_DEFECTO, ...config.whatsappClientes },
      eventosEtiquetas: ETIQUETAS_EVENTOS,
      infoCorreo: this.configIntegraciones.infoCorreo(),
      errores: opts.errores ?? {},
      guardado: opts.guardado ?? false,
    });
  }

  integracionesView = async (_req: Request, res: Response): Promise<void> => {
    await this.renderIntegraciones(res);
  };

  integracionesPost = async (req: Request, res: Response): Promise<void> => {
    const b = req.body ?? {};
    try {
      await this.configIntegraciones.actualizar({
        actor: req.user!,
        n8nWebhookTickets: str(b.n8nWebhookTickets),
        n8nWebhookCotizaciones: str(b.n8nWebhookCotizaciones),
        n8nWebhookEmpresas: str(b.n8nWebhookEmpresas),
        whatsappHabilitado: b.whatsappHabilitado === 'on' || b.whatsappHabilitado === 'true',
        whatsappTelefono: str(b.whatsappTelefono),
        whatsappApiKey: str(b.whatsappApiKey),
        whatsappOtros: str(b.whatsappOtros),
        whatsappClientes: {
          proveedor: str(b.waProveedor) as ProveedorWhatsAppClientes,
          metaToken: str(b.waMetaToken),
          metaPhoneNumberId: str(b.waMetaPhoneNumberId),
          metaPlantilla: str(b.waMetaPlantilla),
          metaIdioma: str(b.waMetaIdioma),
          twilioAccountSid: str(b.waTwilioAccountSid),
          twilioAuthToken: str(b.waTwilioAuthToken),
          twilioFrom: str(b.waTwilioFrom),
          twilioContentSid: str(b.waTwilioContentSid),
        },
        reglas: ConfiguracionIntegracionesService.reglasDeForm(b),
      });
      await this.renderIntegraciones(res, { guardado: true });
    } catch (err) {
      await this.renderIntegraciones(res, { status: 422, errores: camposDeError(err) });
    }
  };

  probarWebhookPost = async (req: Request, res: Response): Promise<void> => {
    try {
      const resultado = await this.configIntegraciones.probarWebhook(req.user!, str(req.body?.url));
      res.json(resultado);
    } catch (err) {
      res.status(422).json({ ok: false, detalle: err instanceof Error ? err.message : 'No se pudo probar' });
    }
  };

  correoEntranteView = async (req: Request, res: Response): Promise<void> => {
    await this.renderCorreoEntrante(req, res);
  };

  private async renderCorreoEntrante(
    req: Request,
    res: Response,
    extra: { guardado?: boolean; aviso?: string; error?: string } = {},
  ): Promise<void> {
    res.render('pages/backoffice/configuracion/correo-entrante', {
      titulo: 'Correo entrante',
      cfg: await this.correoEntrante.configuracion(req.user!),
      guardado: false,
      aviso: '',
      error: '',
      ...extra,
    });
  }

  correoEntrantePost = async (req: Request, res: Response): Promise<void> => {
    const b = req.body ?? {};
    await this.correoEntrante.guardar(req.user!, {
      habilitado: b.habilitado === 'on',
      region: str(b.region),
      clientId: str(b.clientId),
      clientSecret: str(b.clientSecret),
      refreshToken: str(b.refreshToken),
      accountId: str(b.accountId),
      carpeta: str(b.carpeta),
      soloContactoDelTicket: b.soloContactoDelTicket === 'on',
    });
    await this.renderCorreoEntrante(req, res, { guardado: true });
  };

  correoEntranteProbarPost = async (req: Request, res: Response): Promise<void> => {
    try {
      const datos = await this.correoEntrante.verificar(req.user!);
      await this.renderCorreoEntrante(req, res, {
        aviso: `Conexión correcta con ${datos.correo || 'la cuenta'} (accountId ${datos.accountId}, guardado).`,
      });
    } catch (err) {
      await this.renderCorreoEntrante(req, res, { error: err instanceof Error ? err.message : 'No se pudo conectar' });
    }
  };

  correoEntranteRevisarPost = async (req: Request, res: Response): Promise<void> => {
    try {
      const r = await this.correoEntrante.revisarManual(req.user!);
      const detalle = r.omitidos.map((o) => `• ${o.asunto || '(sin asunto)'} de ${o.de}: ${o.motivo}`).join(' ');
      await this.renderCorreoEntrante(req, res, {
        aviso: `Revisados ${r.revisados}, agregados ${r.agregados}.${detalle ? ` Sin ligar: ${detalle}` : ''}`,
      });
    } catch (err) {
      await this.renderCorreoEntrante(req, res, { error: err instanceof Error ? err.message : 'No se pudo revisar' });
    }
  };

  probarWhatsappClientesPost = async (req: Request, res: Response): Promise<void> => {
    try {
      res.json(await this.configIntegraciones.probarWhatsAppClientes(req.user!, str(req.body?.telefono)));
    } catch (err) {
      res.status(422).json({ ok: false, detalle: err instanceof Error ? err.message : 'No se pudo probar' });
    }
  };

  probarWhatsappPost = async (req: Request, res: Response): Promise<void> => {
    try {
      const resultado = await this.configIntegraciones.probarWhatsApp(
        req.user!,
        str(req.body?.telefono),
        str(req.body?.apiKey),
      );
      res.json(resultado);
    } catch (err) {
      res.status(422).json({ ok: false, detalle: err instanceof Error ? err.message : 'No se pudo probar' });
    }
  };

  probarCorreoPost = async (req: Request, res: Response): Promise<void> => {
    try {
      const resultado = await this.configIntegraciones.probarCorreo(req.user!, str(req.body?.email));
      res.json(resultado);
    } catch (err) {
      res.status(422).json({ ok: false, detalle: err instanceof Error ? err.message : 'No se pudo probar' });
    }
  };

  calculadoraView = async (_req: Request, res: Response): Promise<void> => {
    res.render('pages/backoffice/configuracion/calculadora', {
      titulo: 'Configuración de la calculadora',
      config: await this.configCalculadora.obtener(),
      errores: {},
      guardado: false,
    });
  };

  calculadoraPost = async (req: Request, res: Response): Promise<void> => {
    const b = req.body ?? {};
    const precios: Record<string, { precioPrimero?: unknown; precioAdicional?: unknown }> = {};
    for (const [k, v] of Object.entries(b)) {
      if (k.startsWith('precioPrimero_')) {
        const clave = k.slice('precioPrimero_'.length);
        precios[clave] = { ...precios[clave], precioPrimero: v };
      }
      if (k.startsWith('precioAdicional_')) {
        const clave = k.slice('precioAdicional_'.length);
        precios[clave] = { ...precios[clave], precioAdicional: v };
      }
    }
    try {
      await this.configCalculadora.actualizar({
        actor: req.user!,
        precios,
        sqlPrecioServidor: b.sqlPrecioServidor,
        sqlPrecioTerminal: b.sqlPrecioTerminal,
        ivaTasa: b.ivaTasa,
        moneda: str(b.moneda),
      });
      res.render('pages/backoffice/configuracion/calculadora', {
        titulo: 'Configuración de la calculadora',
        config: await this.configCalculadora.obtener(),
        errores: {},
        guardado: true,
      });
    } catch (err) {
      res.status(422).render('pages/backoffice/configuracion/calculadora', {
        titulo: 'Configuración de la calculadora',
        config: await this.configCalculadora.obtener(),
        errores: camposDeError(err),
        guardado: false,
      });
    }
  };

  private async renderApariencia(
    res: Response,
    opts: { status?: number; errores?: Record<string, string> } = {},
  ): Promise<void> {
    const logo = await this.configLogo.obtener();
    res.status(opts.status ?? 200).render('pages/backoffice/configuracion/apariencia', {
      titulo: 'Apariencia',
      logo,
      errores: opts.errores ?? {},
    });
  }

  aparienciaView = async (_req: Request, res: Response): Promise<void> => {
    await this.renderApariencia(res);
  };

  /** Sube el logo: el navegador manda `{contentType, base64}` como JSON (igual que los
   * adjuntos de tickets), sin multer. */
  logoSubirPost = async (req: Request, res: Response): Promise<void> => {
    try {
      await this.configLogo.actualizar(req.user!, {
        contentType: str(req.body?.contentType),
        base64: str(req.body?.base64),
      });
      res.json({ ok: true });
    } catch (err) {
      res.status(422).json({ ok: false, error: err instanceof Error ? err.message : 'No se pudo subir el logo' });
    }
  };

  logoEliminarPost = async (req: Request, res: Response): Promise<void> => {
    await this.configLogo.eliminar(req.user!);
    res.redirect('/app/configuracion/apariencia');
  };

  /** Ruta pública (sin sesión): así los correos y el portal pueden mostrar el logo. */
  logoArchivoGet = async (_req: Request, res: Response): Promise<void> => {
    const logo = await this.configLogo.obtener();
    if (!logo) {
      res.status(404).end();
      return;
    }
    const base64 = logo.data.slice(logo.data.indexOf(',') + 1);
    res.setHeader('Content-Type', logo.contentType);
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.send(Buffer.from(base64, 'base64'));
  };

  private async renderResumen(
    res: Response,
    opts: { status?: number; errores?: Record<string, string>; guardado?: boolean; enviadoA?: string[] } = {},
  ): Promise<void> {
    res.status(opts.status ?? 200).render('pages/backoffice/configuracion/resumen', {
      titulo: 'Resumen diario',
      config: await this.configResumen.obtenerConfig(),
      errores: opts.errores ?? {},
      guardado: opts.guardado ?? false,
      enviadoA: opts.enviadoA ?? null,
    });
  }

  resumenView = async (_req: Request, res: Response): Promise<void> => {
    await this.renderResumen(res);
  };

  resumenPost = async (req: Request, res: Response): Promise<void> => {
    const b = req.body ?? {};
    try {
      await this.configResumen.actualizarConfig({
        actor: req.user!,
        habilitado: b.habilitado === 'on' || b.habilitado === 'true',
        destinatarios: str(b.destinatarios),
        horaEnvio: b.horaEnvio,
      });
      await this.renderResumen(res, { guardado: true });
    } catch (err) {
      await this.renderResumen(res, { status: 422, errores: camposDeError(err) });
    }
  };

  resumenEnviarPost = async (req: Request, res: Response): Promise<void> => {
    try {
      const { enviadoA } = await this.configResumen.enviarAhora(req.user!);
      await this.renderResumen(res, { enviadoA });
    } catch (err) {
      await this.renderResumen(res, { status: 422, errores: camposDeError(err) });
    }
  };
}
