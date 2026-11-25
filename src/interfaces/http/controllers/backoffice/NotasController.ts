import type { Request, Response } from 'express';
import type { NotasPersonalesService, PersonaNotas } from '../../../../application/notas/NotasPersonalesService.js';
import { COLORES_NOTA, DIAS_PAPELERA_NOTAS, type NotaPersonal } from '../../../../core/entities/NotaPersonal.js';
import { ZONA_MEXICO } from '../../../../core/entities/value-objects/horaMexico.js';
import type { IClock } from '../../../../core/ports/services/IClock.js';

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

/** «AAAA-MM-DD» de hoy en México. */
export function hoyMexico(ahora: Date): string {
  return ahora.toLocaleDateString('en-CA', { timeZone: ZONA_MEXICO });
}

/** «15:16» si es de hoy, «3/11/2026» si no (como Sticky Notes), en hora de México. */
export function cuandoNota(d: Date, ahora: Date): string {
  const dia = (x: Date) => x.toLocaleDateString('es-MX', { timeZone: ZONA_MEXICO });
  return dia(d) === dia(ahora)
    ? d.toLocaleTimeString('es-MX', { timeZone: ZONA_MEXICO, hour: '2-digit', minute: '2-digit', hour12: false })
    : dia(d);
}

/** «27 nov» a partir de «2026-11-27». */
export function diaCorto(dia: string): string {
  return new Date(`${dia}T12:00:00Z`).toLocaleDateString('es-MX', { timeZone: 'UTC', day: 'numeric', month: 'short' });
}

/** Valor booleano que llega del JSON o de un formulario. */
const booleano = (v: unknown): boolean | undefined =>
  v === true || v === 'true' || v === '1' || v === 'on' ? true : v === false || v === 'false' || v === '0' ? false : undefined;

/** 🗒️ Notas personales tipo Sticky Notes. */
export class NotasController {
  constructor(
    private readonly notas: NotasPersonalesService,
    private readonly clock: IClock,
  ) {}

  private persona(req: Request): PersonaNotas {
    return { uid: req.user!.uid, nombre: req.user!.nombre };
  }

  private vm(n: NotaPersonal) {
    const ahora = this.clock.now();
    const hoy = hoyMexico(ahora);
    const quedanDias = n.eliminadaEn
      ? Math.max(0, DIAS_PAPELERA_NOTAS - Math.floor((ahora.getTime() - n.eliminadaEn.getTime()) / 86_400_000))
      : null;
    return {
      id: n.id,
      texto: n.texto,
      color: n.color,
      cuando: cuandoNota(n.actualizadaEn, ahora),
      fijada: n.fijada,
      recordarEn: n.recordarEn ?? '',
      recordatorio: n.recordarEn
        ? {
            texto: n.recordarEn === hoy ? 'Hoy' : diaCorto(n.recordarEn),
            estado: n.recordarEn < hoy ? 'vencido' : n.recordarEn === hoy ? 'hoy' : 'futuro',
          }
        : null,
      tickets: n.tickets,
      quedanDias,
    };
  }

  vista = async (req: Request, res: Response): Promise<void> => {
    const t = await this.notas.listarTodo(req.user!.uid);
    res.render('pages/backoffice/notas', {
      titulo: 'Mis notas',
      notas: t.activas.map((n) => this.vm(n)),
      conTicket: t.conTicket.map((n) => this.vm(n)),
      papelera: t.papelera.map((n) => this.vm(n)),
      diasPapelera: DIAS_PAPELERA_NOTAS,
      colores: COLORES_NOTA,
    });
  };

  /** Crea o actualiza una nota (la página guarda sola mientras escribes). JSON. */
  guardarPost = async (req: Request, res: Response): Promise<void> => {
    const b = req.body ?? {};
    try {
      const fijada = booleano(b.fijada);
      const nota = await this.notas.guardar(this.persona(req), {
        ...(str(b.id) ? { id: str(b.id) } : {}),
        ...(typeof b.texto === 'string' ? { texto: b.texto } : {}),
        ...(str(b.color) ? { color: str(b.color) } : {}),
        ...(fijada !== undefined ? { fijada } : {}),
        ...(b.recordarEn !== undefined ? { recordarEn: str(b.recordarEn) || null } : {}),
      });
      res.json({ ok: true, nota: this.vm(nota) });
    } catch (err) {
      res.status(422).json({ ok: false, detalle: err instanceof Error ? err.message : 'No se pudo guardar' });
    }
  };

  /** Manda la nota a la papelera. JSON. */
  eliminarPost = async (req: Request, res: Response): Promise<void> => {
    await this.notas.eliminar(this.persona(req), str(req.params.id));
    res.json({ ok: true });
  };

  /** Saca la nota de la papelera. JSON. */
  restaurarPost = async (req: Request, res: Response): Promise<void> => {
    try {
      const nota = await this.notas.restaurar(this.persona(req), str(req.params.id));
      res.json({ ok: true, nota: this.vm(nota) });
    } catch (err) {
      res.status(404).json({ ok: false, detalle: err instanceof Error ? err.message : 'No se pudo restaurar' });
    }
  };

  /** Borra la nota para siempre (solo si ya estaba en la papelera). JSON. */
  borrarDefinitivoPost = async (req: Request, res: Response): Promise<void> => {
    await this.notas.borrarDefinitivo(this.persona(req), str(req.params.id));
    res.json({ ok: true });
  };
}
