import type { Request, Response } from 'express';
import type { SeguimientoService } from '../../../../application/seguimiento/SeguimientoService.js';
import type { IUsuarioRepository } from '../../../../core/ports/repositories/IUsuarioRepository.js';
import type { TipoInteraccion } from '../../../../core/entities/Interaccion.js';
import { camposDeError } from '../../support/errores.js';

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

/** Seguimiento comercial: interacciones y tareas. */
export class SeguimientoController {
  constructor(
    private readonly seguimiento: SeguimientoService,
    private readonly usuarios: IUsuarioRepository,
  ) {}

  // ── Tareas ───────────────────────────────────────────────────────────────
  tareas = async (req: Request, res: Response): Promise<void> => {
    const soloMias = req.query.todas !== '1';
    const filtro = soloMias ? { asignadoAUid: req.user!.uid } : {};
    const [tareas, staff] = await Promise.all([
      this.seguimiento.listarTareas(filtro),
      this.usuarios.list({ activo: true }),
    ]);
    res.render('pages/backoffice/seguimiento/tareas', {
      titulo: 'Tareas',
      tareas,
      soloMias,
      staff: staff.filter((u) => u.esStaff),
      errores: {},
    });
  };

  crearTareaPost = async (req: Request, res: Response): Promise<void> => {
    const b = req.body ?? {};
    try {
      const asignado = str(b.asignadoAUid) || req.user!.uid;
      const u = await this.usuarios.findByUid(asignado);
      await this.seguimiento.crearTarea({
        actor: req.user!,
        titulo: str(b.titulo),
        descripcion: str(b.descripcion),
        empresaId: str(b.empresaId) || undefined,
        ticketId: str(b.ticketId) || undefined,
        asignadoAUid: asignado,
        asignadoANombre: u?.nombre,
        vence: str(b.vence) || undefined,
      });
      res.redirect(str(b.volverA) || '/app/tareas');
    } catch (err) {
      const staff = (await this.usuarios.list({ activo: true })).filter((u) => u.esStaff);
      const tareas = await this.seguimiento.listarTareas({ asignadoAUid: req.user!.uid });
      res.status(422).render('pages/backoffice/seguimiento/tareas', {
        titulo: 'Tareas',
        tareas,
        soloMias: true,
        staff,
        errores: camposDeError(err),
      });
    }
  };

  marcarTareaPost = async (req: Request, res: Response): Promise<void> => {
    await this.seguimiento.marcarTarea(req.user!, str(req.params.id), req.body?.completada === 'true');
    res.redirect(str(req.body?.volverA) || '/app/tareas');
  };

  // ── Interacciones (desde el detalle de empresa) ──────────────────────────
  crearInteraccionPost = async (req: Request, res: Response): Promise<void> => {
    const b = req.body ?? {};
    await this.seguimiento.registrarInteraccion({
      actor: req.user!,
      empresaId: str(b.empresaId),
      contactoId: str(b.contactoId) || undefined,
      tipo: (str(b.tipo) || 'nota') as TipoInteraccion,
      fecha: str(b.fecha),
      resumen: str(b.resumen),
    });
    res.redirect(`/app/empresas/${str(b.empresaId)}`);
  };
}
