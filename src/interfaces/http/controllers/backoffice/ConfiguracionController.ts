import type { Request, Response } from 'express';
import type { ConfiguracionTicketsService } from '../../../../application/configuracion/ConfiguracionTicketsService.js';
import type { BackupService } from '../../../../application/configuracion/BackupService.js';
import { camposDeError } from '../../support/errores.js';

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

/** Configuración → Tickets (catálogos, SLA, notificaciones del portal) y backup. */
export class ConfiguracionController {
  constructor(
    private readonly configTickets: ConfiguracionTicketsService,
    private readonly backup: BackupService,
  ) {}

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
}
