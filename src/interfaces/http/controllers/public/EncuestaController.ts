import type { Request, Response } from 'express';
import { EncuestaSatisfaccionService } from '../../../../application/tickets/EncuestaSatisfaccionService.js';
import { DomainError } from '../../../../core/errors/DomainError.js';

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

/** Página pública (sin login) de la encuesta de satisfacción de un ticket. */
export class EncuestaController {
  constructor(private readonly encuesta: EncuestaSatisfaccionService) {}

  ver = async (req: Request, res: Response): Promise<void> => {
    const id = str(req.params.id);
    const firma = str(req.params.firma);
    const c = Number(req.query.c);
    try {
      const ticket = Number.isInteger(c) && c >= 1 && c <= 5
        ? await this.encuesta.responder(id, firma, c)
        : await this.encuesta.ver(id, firma);
      this.render(res, ticket, firma, false);
    } catch (err) {
      this.error(res, err);
    }
  };

  guardarPost = async (req: Request, res: Response): Promise<void> => {
    const id = str(req.params.id);
    const firma = str(req.params.firma);
    try {
      const ticket = await this.encuesta.responder(
        id,
        firma,
        Number(req.body?.calificacion),
        str(req.body?.comentario),
      );
      this.render(res, ticket, firma, true);
    } catch (err) {
      this.error(res, err);
    }
  };

  private render(res: Response, ticket: { id: string; numero: number; asunto: string; satisfaccion: { calificacion: number; comentario: string | null } | null }, firma: string, gracias: boolean): void {
    res.render('pages/public/encuesta', {
      titulo: 'Encuesta de satisfacción',
      ticket,
      firma,
      gracias,
      etiquetas: [1, 2, 3, 4, 5].map((n) => ({ n, etiqueta: EncuestaSatisfaccionService.etiqueta(n) })),
    });
  }

  private error(res: Response, err: unknown): void {
    if (!(err instanceof DomainError)) throw err;
    res.status(404).render('pages/public/encuesta', { titulo: 'Encuesta', invalida: true });
  }
}
