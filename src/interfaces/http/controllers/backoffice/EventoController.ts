import type { Request, Response } from 'express';
import type { EventoService } from '../../../../application/eventos/EventoService.js';
import type { EstadoInscripcion } from '../../../../core/entities/Inscripcion.js';
import {
  RESPUESTAS_INVITACION,
  RESPUESTA_INVITACION_ETIQUETA,
  type EstadoEvento,
  type RespuestaInvitacion,
} from '../../../../core/entities/Evento.js';
import { camposDeError } from '../../support/errores.js';

const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const n = (v: unknown): number => (Number.isFinite(Number(v)) ? Number(v) : 0);
const bool = (v: unknown): boolean => v === 'on' || v === 'true' || v === true;
const respuesta = (v: unknown): RespuestaInvitacion | undefined =>
  RESPUESTAS_INVITACION.includes(v as RespuestaInvitacion) ? (v as RespuestaInvitacion) : undefined;

/** Gestión de eventos/webinars (staff). */
export class EventoController {
  constructor(private readonly eventos: EventoService) {}

  listar = async (_req: Request, res: Response): Promise<void> => {
    const eventos = await this.eventos.listar();
    res.render('pages/backoffice/eventos/list', { titulo: 'Eventos', eventos });
  };

  nuevo = (_req: Request, res: Response): void => {
    res.render('pages/backoffice/eventos/form', { titulo: 'Nuevo evento', modo: 'crear', valores: { estado: 'borrador', horasRecordatorio: 24 }, errores: {} });
  };

  editar = async (req: Request, res: Response): Promise<void> => {
    const evento = await this.eventos.obtener(str(req.params.id));
    res.render('pages/backoffice/eventos/form', {
      titulo: `Editar ${evento.titulo}`,
      modo: 'editar',
      evento,
      valores: { ...evento, fechaHora: evento.fechaHora.toISOString().slice(0, 16) },
      errores: {},
    });
  };

  guardarPost = async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id ? str(req.params.id) : undefined;
    const b = req.body ?? {};
    try {
      const evento = await this.eventos.guardar(
        req.user!,
        {
          titulo: str(b.titulo),
          descripcion: str(b.descripcion),
          fechaHora: str(b.fechaHora),
          cupo: n(b.cupo),
          urlWebinar: str(b.urlWebinar),
          horasRecordatorio: n(b.horasRecordatorio) || 24,
          limiteRegistrosPorIp: str(b.limiteRegistrosPorIp) ? Math.max(1, n(b.limiteRegistrosPorIp)) : null,
          estado: (str(b.estado) || 'borrador') as EstadoEvento,
        },
        id,
      );
      res.redirect(`/app/eventos/${evento.id}`);
    } catch (err) {
      res.status(422).render('pages/backoffice/eventos/form', {
        titulo: id ? 'Editar evento' : 'Nuevo evento',
        modo: id ? 'editar' : 'crear',
        evento: id ? { id } : null,
        valores: b,
        errores: camposDeError(err),
      });
    }
  };

  ver = async (req: Request, res: Response): Promise<void> => {
    const id = str(req.params.id);
    const [{ evento, inscritos }, listaNegra, empresasCartera, historialEmpresas] = await Promise.all([
      this.eventos.detalleConInscritos(id),
      this.eventos.listaNegraTodos(),
      this.eventos.empresasParaInvitar(),
      this.eventos.historialEmpresas(id),
    ]);
    res.render('pages/backoffice/eventos/detail', {
      titulo: evento.titulo,
      evento,
      inscritos,
      listaNegra,
      empresasCartera,
      historialEmpresas,
      resumen: evento.resumenInvitaciones,
      RESPUESTAS_INVITACION,
      RESPUESTA_INVITACION_ETIQUETA,
    });
  };

  // ── Invitación dirigida a empresas ─────────────────────────────────────
  empresaAgregarPost = async (req: Request, res: Response): Promise<void> => {
    const id = str(req.params.id);
    await this.eventos.agregarEmpresaInvitada(req.user!, id, {
      empresaNombre: str(req.body?.empresaNombre),
      invitadoPor: str(req.body?.invitadoPor) || undefined,
    });
    res.redirect(`/app/eventos/${id}#invitaciones`);
  };

  empresaActualizarPost = async (req: Request, res: Response): Promise<void> => {
    const id = str(req.params.id);
    const b = req.body ?? {};
    await this.eventos.actualizarEmpresaInvitada(req.user!, id, str(req.params.invId), {
      contactado: bool(b.contactado),
      respuesta: respuesta(b.respuesta),
      invitadoPor: b.invitadoPor !== undefined ? str(b.invitadoPor) : undefined,
      notas: b.notas !== undefined ? str(b.notas) : undefined,
    });
    res.redirect(`/app/eventos/${id}#invitaciones`);
  };

  empresaQuitarPost = async (req: Request, res: Response): Promise<void> => {
    const id = str(req.params.id);
    await this.eventos.quitarEmpresaInvitada(req.user!, id, str(req.params.invId));
    res.redirect(`/app/eventos/${id}#invitaciones`);
  };

  externoAgregarPost = async (req: Request, res: Response): Promise<void> => {
    const id = str(req.params.id);
    await this.eventos.agregarInvitadoExterno(req.user!, id, {
      nombre: str(req.body?.nombre) || undefined,
      fuente: str(req.body?.fuente) || undefined,
    });
    res.redirect(`/app/eventos/${id}#invitaciones`);
  };

  externoActualizarPost = async (req: Request, res: Response): Promise<void> => {
    const id = str(req.params.id);
    const b = req.body ?? {};
    await this.eventos.actualizarInvitadoExterno(req.user!, id, str(req.params.extId), {
      nombre: b.nombre !== undefined ? str(b.nombre) : undefined,
      fuente: b.fuente !== undefined ? str(b.fuente) : undefined,
      contactado: bool(b.contactado),
      respuesta: respuesta(b.respuesta),
      notas: b.notas !== undefined ? str(b.notas) : undefined,
    });
    res.redirect(`/app/eventos/${id}#invitaciones`);
  };

  externoQuitarPost = async (req: Request, res: Response): Promise<void> => {
    const id = str(req.params.id);
    await this.eventos.quitarInvitadoExterno(req.user!, id, str(req.params.extId));
    res.redirect(`/app/eventos/${id}#invitaciones`);
  };

  eliminarPost = async (req: Request, res: Response): Promise<void> => {
    await this.eventos.eliminar(req.user!, str(req.params.id));
    res.redirect('/app/eventos');
  };

  marcarInscripcionPost = async (req: Request, res: Response): Promise<void> => {
    await this.eventos.marcarInscripcion(
      req.user!,
      str(req.params.id),
      str(req.params.insId),
      str(req.body?.estado) as EstadoInscripcion,
    );
    res.redirect(`/app/eventos/${str(req.params.id)}`);
  };

  reenviarPost = async (req: Request, res: Response): Promise<void> => {
    await this.eventos.reenviarConfirmacion(req.user!, str(req.params.id), str(req.params.insId));
    res.redirect(`/app/eventos/${str(req.params.id)}`);
  };

  listaNegraAgregarPost = async (req: Request, res: Response): Promise<void> => {
    await this.eventos.agregarListaNegra(req.user!, str(req.body?.email), str(req.body?.motivo));
    res.redirect(`/app/eventos/${str(req.params.id)}`);
  };

  listaNegraQuitarPost = async (req: Request, res: Response): Promise<void> => {
    await this.eventos.quitarListaNegra(req.user!, str(req.body?.email));
    res.redirect(`/app/eventos/${str(req.params.id)}`);
  };
}
