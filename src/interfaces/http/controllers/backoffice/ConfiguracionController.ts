import type { Request, Response } from 'express';
import type { ConfiguracionTicketsService } from '../../../../application/configuracion/ConfiguracionTicketsService.js';
import { camposDeError } from '../../support/errores.js';

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

/** Configuración → Tickets (catálogos, SLA, notificaciones del portal). */
export class ConfiguracionController {
  constructor(private readonly configTickets: ConfiguracionTicketsService) {}

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
