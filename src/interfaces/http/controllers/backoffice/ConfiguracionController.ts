import type { Request, Response } from 'express';
import type { ConfiguracionTicketsService } from '../../../../application/configuracion/ConfiguracionTicketsService.js';
import { ConfiguracionIntegracionesService } from '../../../../application/configuracion/ConfiguracionIntegracionesService.js';
import type { BackupService } from '../../../../application/configuracion/BackupService.js';
import type { AcercaDeService } from '../../../../application/configuracion/AcercaDeService.js';
import type { ConfiguracionCotizacionesService } from '../../../../application/configuracion/ConfiguracionCotizacionesService.js';
import { ETIQUETAS_EVENTOS } from '../../../../core/entities/ConfiguracionIntegraciones.js';
import { INFO_APP } from '../../../../core/entities/AcercaDe.js';
import { camposDeError } from '../../support/errores.js';

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

/** Configuración → Tickets (catálogos, SLA, notificaciones del portal), integraciones y backup. */
export class ConfiguracionController {
  constructor(
    private readonly configTickets: ConfiguracionTicketsService,
    private readonly configIntegraciones: ConfiguracionIntegracionesService,
    private readonly backup: BackupService,
    private readonly acercaDe: AcercaDeService,
    private readonly configCotizaciones: ConfiguracionCotizacionesService,
  ) {}

  cotizacionesView = async (_req: Request, res: Response): Promise<void> => {
    res.render('pages/backoffice/configuracion/cotizaciones', {
      titulo: 'Configuración de cotizaciones',
      config: await this.configCotizaciones.obtener(),
      errores: {},
      guardado: false,
    });
  };

  cotizacionesPost = async (req: Request, res: Response): Promise<void> => {
    const b = req.body ?? {};
    try {
      await this.configCotizaciones.actualizar({
        actor: req.user!,
        condicionesPorDefecto: str(b.condicionesPorDefecto),
        emisorCargoPorDefecto: str(b.emisorCargoPorDefecto),
        emisorTelefonoPorDefecto: str(b.emisorTelefonoPorDefecto),
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

  backupView = (_req: Request, res: Response): void => {
    res.render('pages/backoffice/configuracion/backup', { titulo: 'Backup' });
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

  ticketsView = async (_req: Request, res: Response): Promise<void> => {
    const config = await this.configTickets.obtener();
    res.render('pages/backoffice/configuracion/tickets', {
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
      });
      const config = await this.configTickets.obtener();
      res.render('pages/backoffice/configuracion/tickets', {
        titulo: 'Configuración de tickets',
        config,
        errores: {},
        guardado: true,
      });
    } catch (err) {
      const config = await this.configTickets.obtener();
      res.status(422).render('pages/backoffice/configuracion/tickets', {
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
        whatsappHabilitado: b.whatsappHabilitado === 'on' || b.whatsappHabilitado === 'true',
        whatsappTelefono: str(b.whatsappTelefono),
        whatsappApiKey: str(b.whatsappApiKey),
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
}
