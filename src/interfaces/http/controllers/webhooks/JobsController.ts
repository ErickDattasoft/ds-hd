import type { Request, Response } from 'express';
import type { EventoService } from '../../../../application/eventos/EventoService.js';
import type { ITicketRepository } from '../../../../core/ports/repositories/ITicketRepository.js';
import type { ITicketQueries } from '../../../../core/ports/repositories/ITicketQueries.js';
import type { IIdGenerator } from '../../../../core/ports/services/IIdGenerator.js';
import type { IClock } from '../../../../core/ports/services/IClock.js';
import type { ILogger } from '../../../../core/ports/services/ILogger.js';
import type { BitacoraService } from '../../../../application/shared/BitacoraService.js';
import type { ResumenDiarioService } from '../../../../application/dashboard/ResumenDiarioService.js';

/**
 * Endpoints invocados por el cron (GitHub Actions). Protegidos por bearer `JOBS_SECRET`.
 */
export class JobsController {
  constructor(
    private readonly eventos: EventoService,
    private readonly ticketRepo: ITicketRepository,
    private readonly ticketQueries: ITicketQueries,
    private readonly ids: IIdGenerator,
    private readonly clock: IClock,
    private readonly logger: ILogger,
    private readonly secret: string,
    private readonly bitacora: BitacoraService,
    private readonly resumen: ResumenDiarioService,
  ) {}

  private autorizado(req: Request): boolean {
    const bearer = (req.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
    const key = typeof req.query.key === 'string' ? req.query.key : '';
    return Boolean(this.secret) && (bearer === this.secret || key === this.secret);
  }

  recordatoriosEventos = async (req: Request, res: Response): Promise<void> => {
    if (!this.autorizado(req)) return void res.status(401).json({ error: 'no autorizado' });
    const resultado = await this.eventos.enviarRecordatorios();
    res.json({ ok: true, ...resultado });
  };

  /** Recorre tickets abiertos y anota en su bitácora los que ya incumplieron el SLA. */
  recalcularSla = async (req: Request, res: Response): Promise<void> => {
    if (!this.autorizado(req)) return void res.status(401).json({ error: 'no autorizado' });
    const ahora = this.clock.now();
    const abiertos = await this.ticketQueries.listar({ soloAbiertos: true });
    let vencidos = 0;
    for (const t of abiertos) {
      if (!t.estaVencido(ahora)) continue;
      vencidos++;
      const eventos = await this.ticketRepo.listarEventos(t.id);
      if (eventos.some((e) => e.tipo === 'sla_incumplido')) continue;
      await this.ticketRepo.registrarEvento(t.id, {
        id: this.ids.newId(),
        tipo: 'sla_incumplido',
        resumen: `SLA incumplido (objetivo ${t.sla.horasResolucion}h)`,
        actorUid: null,
        actorNombre: null,
        at: ahora,
      });
    }
    this.logger.info('Recalculo de SLA', { revisados: abiertos.length, vencidos });
    res.json({ ok: true, revisados: abiertos.length, vencidos });
  };

  /** Retención de bitácora: borra entradas más viejas que la ventana de retención. */
  purgarBitacora = async (req: Request, res: Response): Promise<void> => {
    if (!this.autorizado(req)) return void res.status(401).json({ error: 'no autorizado' });
    const r = await this.bitacora.aplicarRetencion();
    res.json({ ok: true, borradas: r.borradas, hayMas: r.hayMas, corte: r.corte.toISOString() });
  };

  /** Corre cada hora; solo envía si está habilitado y coincide la hora local configurada. */
  resumenDiario = async (req: Request, res: Response): Promise<void> => {
    if (!this.autorizado(req)) return void res.status(401).json({ error: 'no autorizado' });
    const resultado = await this.resumen.enviarSiCorresponde();
    res.json({ ok: true, ...resultado });
  };
}
