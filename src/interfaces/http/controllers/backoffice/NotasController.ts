import type { Request, Response } from 'express';
import type { NotasPersonalesService } from '../../../../application/notas/NotasPersonalesService.js';
import { COLORES_NOTA, type NotaPersonal } from '../../../../core/entities/NotaPersonal.js';
import { ZONA_MEXICO } from '../../../../core/entities/value-objects/horaMexico.js';
import type { IClock } from '../../../../core/ports/services/IClock.js';

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

/** «15:16» si es de hoy, «3/11/2026» si no (como Sticky Notes), en hora de México. */
export function cuandoNota(d: Date, ahora: Date): string {
  const dia = (x: Date) => x.toLocaleDateString('es-MX', { timeZone: ZONA_MEXICO });
  return dia(d) === dia(ahora)
    ? d.toLocaleTimeString('es-MX', { timeZone: ZONA_MEXICO, hour: '2-digit', minute: '2-digit', hour12: false })
    : dia(d);
}

/** 🗒️ Notas personales tipo Sticky Notes. */
export class NotasController {
  constructor(
    private readonly notas: NotasPersonalesService,
    private readonly clock: IClock,
  ) {}

  private vm(n: NotaPersonal) {
    return { id: n.id, texto: n.texto, color: n.color, cuando: cuandoNota(n.actualizadaEn, this.clock.now()) };
  }

  vista = async (req: Request, res: Response): Promise<void> => {
    const notas = await this.notas.listar(req.user!.uid);
    res.render('pages/backoffice/notas', {
      titulo: 'Mis notas',
      notas: notas.map((n) => this.vm(n)),
      colores: COLORES_NOTA,
    });
  };

  /** Crea o actualiza una nota (la página guarda sola mientras escribes). JSON. */
  guardarPost = async (req: Request, res: Response): Promise<void> => {
    const b = req.body ?? {};
    try {
      const nota = await this.notas.guardar(req.user!.uid, {
        ...(str(b.id) ? { id: str(b.id) } : {}),
        ...(typeof b.texto === 'string' ? { texto: b.texto } : {}),
        ...(str(b.color) ? { color: str(b.color) } : {}),
      });
      res.json({ ok: true, nota: this.vm(nota) });
    } catch (err) {
      res.status(422).json({ ok: false, detalle: err instanceof Error ? err.message : 'No se pudo guardar' });
    }
  };

  eliminarPost = async (req: Request, res: Response): Promise<void> => {
    await this.notas.eliminar(req.user!.uid, str(req.params.id));
    res.json({ ok: true });
  };
}
