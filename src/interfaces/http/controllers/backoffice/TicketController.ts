import type { Request, Response } from 'express';
import type { CrearTicketService } from '../../../../application/tickets/CrearTicketService.js';
import type { ActualizarEstadoTicketService } from '../../../../application/tickets/ActualizarEstadoTicketService.js';
import type { AsignarAgenteService } from '../../../../application/tickets/AsignarAgenteService.js';
import type { RegistrarNotaService } from '../../../../application/tickets/RegistrarNotaService.js';
import type { MarcarFacturacionService } from '../../../../application/tickets/MarcarFacturacionService.js';
import type { ProgramarAtencionService } from '../../../../application/tickets/ProgramarAtencionService.js';
import type { ArchivarTicketService } from '../../../../application/tickets/ArchivarTicketService.js';
import type { ListarTicketsService } from '../../../../application/tickets/ListarTicketsService.js';
import type { VerTicketService } from '../../../../application/tickets/VerTicketService.js';
import type { PanelCargaAgentesService } from '../../../../application/tickets/PanelCargaAgentesService.js';
import type { GestionTicketPublicoService } from '../../../../application/tickets/GestionTicketPublicoService.js';
import type { TicketExcelService } from '../../../../application/tickets/TicketExcelService.js';
import type { ITicketPublicoRepository } from '../../../../core/ports/repositories/ITicketPublicoRepository.js';
import type { IUsuarioRepository } from '../../../../core/ports/repositories/IUsuarioRepository.js';
import type { IClock } from '../../../../core/ports/services/IClock.js';
import type { FiltroTickets } from '../../../../core/ports/repositories/ITicketQueries.js';
import { parsePrioridad } from '../../../../core/entities/value-objects/Prioridad.js';
import { ROLES_TECNICOS } from '../../../../core/entities/value-objects/Rol.js';
import {
  ESTADOS_FACTURACION,
  ETIQUETAS_FACTURACION,
  esEstadoFacturacion,
  parseEstadoFacturacion,
} from '../../../../core/entities/value-objects/EstadoFacturacion.js';
import { parseAgenda } from '../../../../core/entities/value-objects/AgendaTicket.js';
import { ticketVM } from '../../presenters/TicketPresenter.js';
import { camposDeError } from '../../support/errores.js';

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

const catalogoFacturacion = (): { valor: string; etiqueta: string }[] =>
  ESTADOS_FACTURACION.map((valor) => ({ valor, etiqueta: ETIQUETAS_FACTURACION[valor] }));

/** Módulo de tickets del back-office. */
export class TicketController {
  constructor(
    private readonly crear: CrearTicketService,
    private readonly cambiarEstado: ActualizarEstadoTicketService,
    private readonly asignar: AsignarAgenteService,
    private readonly registrarNota: RegistrarNotaService,
    private readonly facturar: MarcarFacturacionService,
    private readonly programarAtencion: ProgramarAtencionService,
    private readonly archivar: ArchivarTicketService,
    private readonly listar: ListarTicketsService,
    private readonly ver: VerTicketService,
    private readonly cargaAgentes: PanelCargaAgentesService,
    private readonly gestionPublico: GestionTicketPublicoService,
    private readonly buzon: ITicketPublicoRepository,
    private readonly usuarios: IUsuarioRepository,
    private readonly clock: IClock,
    private readonly excel: TicketExcelService,
  ) {}

  private filtroDeQuery(req: Request): FiltroTickets {
    const q = req.query;
    return {
      ...(str(q.estado) ? { estado: str(q.estado) } : {}),
      ...(str(q.prioridad) ? { prioridad: str(q.prioridad) } : {}),
      ...(str(q.grupo) ? { grupo: str(q.grupo) } : {}),
      ...(str(q.agente) ? { agenteAsignadoUid: str(q.agente) } : {}),
      ...(q.sinAsignar === '1' ? { sinAsignar: true } : {}),
      ...(str(q.texto) ? { texto: str(q.texto) } : {}),
      ...(q.abiertos !== '0' ? { soloAbiertos: true } : {}),
      ...(q.agenda === '1' ? { soloProgramados: true } : {}),
      archivado: false,
    };
  }

  listarView = async (req: Request, res: Response): Promise<void> => {
    const filtro = this.filtroDeQuery(req);
    const { tickets, total, config } = await this.listar.listar(req.user!, filtro);
    const ahora = this.clock.now();
    res.render('pages/backoffice/tickets/list', {
      titulo: 'Tickets',
      tickets: tickets.map((t) => ticketVM(t, ahora)),
      total,
      config,
      filtro: req.query,
    });
  };

  exportarExcel = async (req: Request, res: Response): Promise<void> => {
    const buffer = await this.excel.exportar(this.filtroDeQuery(req));
    const fecha = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Disposition', `attachment; filename="tickets-${fecha}.xlsx"`);
    res.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet').send(buffer);
  };

  tableroView = async (req: Request, res: Response): Promise<void> => {
    const { columnas, config } = await this.listar.tablero(req.user!, this.filtroDeQuery(req));
    const ahora = this.clock.now();
    res.render('pages/backoffice/tickets/kanban', {
      titulo: 'Tablero de tickets',
      columnas: columnas.map((c) => ({ estado: c.estado, tickets: c.tickets.map((t) => ticketVM(t, ahora)) })),
      config,
    });
  };

  misAsignadosView = async (req: Request, res: Response): Promise<void> => {
    const { tickets, config } = await this.listar.listar(req.user!, {
      agenteAsignadoUid: req.user!.uid,
      soloAbiertos: req.query.abiertos !== '0',
      archivado: false,
    });
    const ahora = this.clock.now();
    res.render('pages/backoffice/tickets/mis-asignados', {
      titulo: 'Mis tickets asignados',
      tickets: tickets.map((t) => ticketVM(t, ahora)),
      config,
    });
  };

  cargaAgentesView = async (_req: Request, res: Response): Promise<void> => {
    const carga = await this.cargaAgentes.ejecutar();
    res.render('pages/backoffice/tickets/carga-agentes', { titulo: 'Carga de agentes', carga });
  };

  nuevoForm = async (req: Request, res: Response): Promise<void> => {
    const { config } = await this.listar.listar(req.user!, { limite: 0 });
    res.render('pages/backoffice/tickets/form', {
      titulo: 'Nuevo ticket',
      config,
      estadosFacturacion: catalogoFacturacion(),
      valores: { prioridad: 'Media', estadoFacturacion: 'no_facturado' },
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
        prioridad: parsePrioridad(b.prioridad || 'Media'),
        sistema: str(b.sistema) || null,
        grupo: str(b.grupo) || null,
        empresaNombre: str(b.empresaNombre) || null,
        contactoNombre: str(b.contactoNombre) || null,
        contactoCorreo: str(b.contactoCorreo) || null,
        asignarAlActor: b.asignarAMi === 'on',
        estadoFacturacion: esEstadoFacturacion(b.estadoFacturacion) ? b.estadoFacturacion : undefined,
        agenda: str(b.agendaFecha)
          ? parseAgenda({ fecha: b.agendaFecha, hora: b.agendaHora, recordatorioWhatsapp: b.agendaRecordatorio === 'on' })
          : null,
      });
      res.redirect(`/app/tickets/${ticket.id}`);
    } catch (err) {
      const { config } = await this.listar.listar(req.user!, { limite: 0 });
      res.status(422).render('pages/backoffice/tickets/form', {
        titulo: 'Nuevo ticket',
        config,
        estadosFacturacion: catalogoFacturacion(),
        valores: b,
        errores: camposDeError(err),
      });
    }
  };

  detalleView = async (req: Request, res: Response): Promise<void> => {
    const d = await this.ver.ejecutar(req.user!, str(req.params.id));
    const ahora = this.clock.now();
    const agentes = d.puedeAsignar
      ? await this.usuarios.list({ roles: ROLES_TECNICOS, activo: true })
      : [];
    res.render('pages/backoffice/tickets/detail', {
      titulo: `Ticket #${d.ticket.numero}`,
      vm: ticketVM(d.ticket, ahora),
      ticket: d.ticket,
      notas: d.notas,
      eventos: d.eventos,
      config: d.config,
      estadosFacturacion: catalogoFacturacion(),
      permisos: {
        editar: d.puedeEditar,
        asignar: d.puedeAsignar,
        cambiarEstado: d.puedeCambiarEstado,
        notasInternas: req.user!.permisos.includes('tickets:ver_notas_internas'),
        eliminar: req.user!.permisos.includes('tickets:eliminar'),
      },
      agentes,
      errores: {},
    });
  };

  cambiarEstadoPost = async (req: Request, res: Response): Promise<void> => {
    await this.cambiarEstado.ejecutar({
      actor: req.user!,
      ticketId: str(req.params.id),
      nuevoEstado: str(req.body?.estado),
      nota: str(req.body?.nota) || undefined,
    });
    res.redirect(`/app/tickets/${str(req.params.id)}`);
  };

  asignarPost = async (req: Request, res: Response): Promise<void> => {
    await this.asignar.ejecutar({
      actor: req.user!,
      ticketId: str(req.params.id),
      agenteUid: str(req.body?.agenteUid),
      forzar: req.body?.forzar === 'on',
    });
    res.redirect(`/app/tickets/${str(req.params.id)}`);
  };

  notaPost = async (req: Request, res: Response): Promise<void> => {
    await this.registrarNota.ejecutar({
      actor: req.user!,
      ticketId: str(req.params.id),
      cuerpo: str(req.body?.cuerpo),
      tipo: req.body?.tipo === 'interna' ? 'interna' : 'publica',
    });
    res.redirect(`/app/tickets/${str(req.params.id)}`);
  };

  facturarPost = async (req: Request, res: Response): Promise<void> => {
    await this.facturar.ejecutar({
      actor: req.user!,
      ticketId: str(req.params.id),
      estado: parseEstadoFacturacion(req.body?.estado),
    });
    res.redirect(`/app/tickets/${str(req.params.id)}`);
  };

  agendaPost = async (req: Request, res: Response): Promise<void> => {
    await this.programarAtencion.ejecutar({
      actor: req.user!,
      ticketId: str(req.params.id),
      fecha: str(req.body?.agendaFecha),
      hora: str(req.body?.agendaHora),
      recordatorioWhatsapp: req.body?.agendaRecordatorio === 'on' || req.body?.agendaRecordatorio === 'true',
    });
    res.redirect(`/app/tickets/${str(req.params.id)}`);
  };

  archivarPost = async (req: Request, res: Response): Promise<void> => {
    await this.archivar.ejecutar({
      actor: req.user!,
      ticketId: str(req.params.id),
      archivar: req.body?.archivar !== 'false',
    });
    res.redirect('/app/tickets');
  };

  // ── Buzón público ─────────────────────────────────────────────────────────
  buzonView = async (_req: Request, res: Response): Promise<void> => {
    const pendientes = await this.buzon.listPendientes();
    res.render('pages/backoffice/tickets/buzon', { titulo: 'Tickets del portal', pendientes });
  };

  aceptarPublicoPost = async (req: Request, res: Response): Promise<void> => {
    const ticket = await this.gestionPublico.aceptar({ actor: req.user!, id: str(req.params.id) });
    res.redirect(`/app/tickets/${ticket.id}`);
  };

  rechazarPublicoPost = async (req: Request, res: Response): Promise<void> => {
    await this.gestionPublico.rechazar({ actor: req.user!, id: str(req.params.id) });
    res.redirect('/app/tickets/buzon');
  };
}
