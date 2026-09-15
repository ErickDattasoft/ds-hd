import type { Request, Response } from 'express';
import type { SolicitudAccesoService } from '../../../../application/auth/SolicitudAccesoService.js';

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

/** Staff: revisar y aprobar/rechazar las solicitudes de acceso al back-office. */
export class SolicitudAccesoController {
  constructor(private readonly solicitudes: SolicitudAccesoService) {}

  listar = async (req: Request, res: Response): Promise<void> => {
    const pendientes = await this.solicitudes.listarPendientes(req.user!);
    res.render('pages/backoffice/solicitudes-acceso/list', { titulo: 'Solicitudes de acceso', pendientes });
  };

  aprobarPost = async (req: Request, res: Response): Promise<void> => {
    const solicitud = await this.solicitudes.aprobar(req.user!, str(req.params.id));
    res.redirect(
      `/app/usuarios/nuevo?email=${encodeURIComponent(solicitud.email)}&nombre=${encodeURIComponent(solicitud.nombre)}`,
    );
  };

  rechazarPost = async (req: Request, res: Response): Promise<void> => {
    await this.solicitudes.rechazar(req.user!, str(req.params.id));
    res.redirect('/app/solicitudes-acceso');
  };
}
