import type { Request, Response } from 'express';
import type { CrearTicketPortalService } from '../../../../application/portal/CrearTicketPortalService.js';
import type { MisTicketsService } from '../../../../application/portal/MisTicketsService.js';
import type { ResponderMiTicketService } from '../../../../application/portal/ResponderMiTicketService.js';
import type { AdjuntoTicketService } from '../../../../application/tickets/AdjuntoTicketService.js';
import type { IClock } from '../../../../core/ports/services/IClock.js';
import { ticketVM } from '../../presenters/TicketPresenter.js';
import { camposDeError } from '../../support/errores.js';
import { ValidationError } from '../../../../core/errors/DomainError.js';

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

/** Portal de cliente: crear y dar seguimiento a los tickets propios. */
export class PortalTicketController {
  constructor(
    private readonly crear: CrearTicketPortalService,
    private readonly misTickets: MisTicketsService,
    private readonly responder: ResponderMiTicketService,
    private readonly adjuntos: AdjuntoTicketService,
    private readonly clock: IClock,
  ) {}

  listar = async (req: Request, res: Response): Promise<void> => {
    const incluirCerrados = req.query.cerrados === '1';
    const tickets = await this.misTickets.listar(req.user!, incluirCerrados);
    const ahora = this.clock.now();
    res.render('pages/portal/tickets-list', {
      titulo: 'Mis tickets',
      tickets: tickets.map((t) => ticketVM(t, ahora)),
      incluirCerrados,
    });
  };

  nuevoForm = async (_req: Request, res: Response): Promise<void> => {
    const cfg = await this.misTickets.catalogoParaCrear();
    res.render('pages/portal/ticket-new', {
      titulo: 'Nuevo ticket',
      tipos: cfg.tipos,
      sistemas: cfg.sistemas,
      prioridades: cfg.prioridades,
      valores: { prioridad: 'Media' },
      errores: {},
    });
  };

  crearPost = async (req: Request, res: Response): Promise<void> => {
    const b = req.body ?? {};
    try {
      const ticket = await this.crear.ejecutar({
        actor: req.user!,
        asunto: str(b.asunto),
        descripcion: str(b.descripcion),
        tipo: str(b.tipo),
        prioridad: str(b.prioridad) || 'Media',
        sistema: str(b.sistema) || undefined,
      });
      res.redirect(`/portal/tickets/${ticket.id}`);
    } catch (err) {
      const cfg = await this.misTickets.catalogoParaCrear();
      res.status(422).render('pages/portal/ticket-new', {
        titulo: 'Nuevo ticket',
        tipos: cfg.tipos,
        sistemas: cfg.sistemas,
        prioridades: cfg.prioridades,
        valores: b,
        errores: camposDeError(err),
      });
    }
  };

  detalle = async (req: Request, res: Response): Promise<void> => {
    const d = await this.misTickets.verDetalle(req.user!, str(req.params.id));
    res.render('pages/portal/ticket-detail', {
      titulo: `Ticket #${d.ticket.numero}`,
      vm: ticketVM(d.ticket, this.clock.now()),
      ticket: d.ticket,
      notas: d.notas,
      eventos: d.eventos,
      adjuntos: d.adjuntos,
      errores: {},
    });
  };

  responderPost = async (req: Request, res: Response): Promise<void> => {
    const id = str(req.params.id);
    try {
      await this.responder.ejecutar({ actor: req.user!, ticketId: id, cuerpo: str(req.body?.cuerpo) });
      res.redirect(`/portal/tickets/${id}`);
    } catch (err) {
      const d = await this.misTickets.verDetalle(req.user!, id);
      res.status(422).render('pages/portal/ticket-detail', {
        titulo: `Ticket #${d.ticket.numero}`,
        vm: ticketVM(d.ticket, this.clock.now()),
        ticket: d.ticket,
        notas: d.notas,
        eventos: d.eventos,
        adjuntos: d.adjuntos,
        errores: camposDeError(err),
      });
    }
  };

  adjuntoSubirPost = async (req: Request, res: Response): Promise<void> => {
    const b = req.body ?? {};
    try {
      const adj = await this.adjuntos.subir({
        actor: req.user!,
        ticketId: str(req.params.id),
        nombre: str(b.nombre),
        contentType: str(b.contentType),
        base64: str(b.base64),
      });
      res.json({ ok: true, adjunto: adj });
    } catch (err) {
      res.status(err instanceof ValidationError ? 422 : 400).json({
        ok: false,
        detalle: err instanceof Error ? err.message : 'No se pudo subir',
      });
    }
  };

  adjuntoVerGet = async (req: Request, res: Response): Promise<void> => {
    const { nombre, contentType, buffer } = await this.adjuntos.ver(
      req.user!,
      str(req.params.id),
      str(req.params.adjId),
    );
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${nombre.replace(/"/g, '')}"`);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.send(buffer);
  };

  adjuntoEliminarPost = async (req: Request, res: Response): Promise<void> => {
    await this.adjuntos.eliminar(req.user!, str(req.params.id), str(req.params.adjId));
    res.redirect(`/portal/tickets/${str(req.params.id)}`);
  };

  dashboard = async (req: Request, res: Response): Promise<void> => {
    const abiertos = await this.misTickets.listar(req.user!, false);
    const ahora = this.clock.now();
    res.render('pages/portal/dashboard', {
      titulo: 'Portal',
      abiertos: abiertos.map((t) => ticketVM(t, ahora)),
    });
  };
}
