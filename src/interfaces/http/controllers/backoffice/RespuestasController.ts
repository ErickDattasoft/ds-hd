import type { Request, Response } from 'express';
import type { RespuestasSinLeerService } from '../../../../application/tickets/RespuestasSinLeerService.js';

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

/** Buzón «🔔 Respuestas»: respuestas de clientes que nadie del equipo ha visto. */
export class RespuestasController {
  constructor(private readonly respuestas: RespuestasSinLeerService) {}

  listarView = async (req: Request, res: Response): Promise<void> => {
    res.render('pages/backoffice/tickets/respuestas', {
      titulo: '🔔 Respuestas de clientes',
      respuestas: await this.respuestas.listarPara(req.user!),
    });
  };

  /**
   * Conteo para la campana (la página lo consulta cada minuto). La más reciente va aparte para
   * el aviso del navegador.
   */
  contadorJson = async (req: Request, res: Response): Promise<void> => {
    const lista = await this.respuestas.listarPara(req.user!);
    const ultima = lista[0];
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      n: lista.length,
      ultima: ultima
        ? { ticketId: ultima.ticketId, numero: ultima.numero, autorNombre: ultima.autorNombre, extracto: ultima.extracto }
        : null,
    });
  };

  /** La pide el detalle del ticket al mostrarse (no al precargarse con el mouse). */
  leidaPost = async (req: Request, res: Response): Promise<void> => {
    await this.respuestas.marcarLeida(str(req.params.id));
    res.status(204).end();
  };

  todasLeidasPost = async (req: Request, res: Response): Promise<void> => {
    await this.respuestas.marcarTodasLeidas(req.user!);
    res.redirect('/app/tickets/respuestas');
  };
}
