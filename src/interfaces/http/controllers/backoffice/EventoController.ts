import type { Request, Response } from 'express';
import type { EventoService } from '../../../../application/eventos/EventoService.js';
import type { EstadoInscripcion } from '../../../../core/entities/Inscripcion.js';
import type { EstadoEvento } from '../../../../core/entities/Evento.js';
import { camposDeError } from '../../support/errores.js';

const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const n = (v: unknown): number => (Number.isFinite(Number(v)) ? Number(v) : 0);

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
    const [{ evento, inscritos }, listaNegra] = await Promise.all([
      this.eventos.detalleConInscritos(id),
      this.eventos.listaNegraTodos(),
    ]);
    res.render('pages/backoffice/eventos/detail', { titulo: evento.titulo, evento, inscritos, listaNegra });
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
