import type { Request, Response } from 'express';
import type { BitacoraService } from '../../../../application/shared/BitacoraService.js';
import type { IUsuarioRepository } from '../../../../core/ports/repositories/IUsuarioRepository.js';
import type { IClock } from '../../../../core/ports/services/IClock.js';
import type { FiltroBitacora } from '../../../../core/ports/repositories/IBitacoraRepository.js';

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

/** Interpreta `YYYY-MM-DD` como fecha local; `finDelDia` la lleva a las 23:59:59.999. */
function fechaDeQuery(v: unknown, finDelDia = false): Date | undefined {
  const s = str(v);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return undefined;
  const d = new Date(`${s}T${finDelDia ? '23:59:59.999' : '00:00:00'}`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/** Vista del registro de auditoría: filtros, export CSV y limpieza. */
export class BitacoraController {
  constructor(
    private readonly bitacora: BitacoraService,
    private readonly usuarios: IUsuarioRepository,
    private readonly clock: IClock,
  ) {}

  private filtroDeQuery(req: Request): FiltroBitacora {
    const modulo = str(req.query.modulo);
    const actorUid = str(req.query.actor);
    const desde = fechaDeQuery(req.query.desde);
    const hasta = fechaDeQuery(req.query.hasta, true);
    return {
      ...(modulo ? { modulo } : {}),
      ...(actorUid ? { actorUid } : {}),
      ...(desde ? { desde } : {}),
      ...(hasta ? { hasta } : {}),
    };
  }

  listar = async (req: Request, res: Response): Promise<void> => {
    const filtro = this.filtroDeQuery(req);
    const [entradas, usuarios] = await Promise.all([
      this.bitacora.listar({ ...filtro, limite: 300 }),
      this.usuarios.list({}),
    ]);
    const limpiadas = str(req.query.limpiadas);
    const aviso = limpiadas
      ? `Se borraron ${limpiadas} entradas.${req.query.hayMas ? ' Quedan más: vuelve a limpiar.' : ''}`
      : null;

    res.render('pages/backoffice/bitacora/list', {
      titulo: 'Bitácora',
      entradas,
      aviso,
      usuarios: usuarios.map((u) => ({ uid: u.uid, nombre: u.nombre })),
      f: {
        modulo: str(req.query.modulo),
        actor: str(req.query.actor),
        desde: str(req.query.desde),
        hasta: str(req.query.hasta),
      },
    });
  };

  exportarCsv = async (req: Request, res: Response): Promise<void> => {
    const csv = await this.bitacora.exportarCsv(this.filtroDeQuery(req));
    const fecha = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Disposition', `attachment; filename="bitacora-${fecha}.csv"`);
    res.type('text/csv; charset=utf-8').send(`\uFEFF${csv}`); // BOM: Excel abre UTF-8 bien
  };

  limpiar = async (req: Request, res: Response): Promise<void> => {
    const antesDe = fechaDeQuery(req.body?.antesDe, true) ?? this.clock.now();
    const { borradas, hayMas } = await this.bitacora.purgar(antesDe);
    await this.bitacora.registrar({
      actor: req.user ?? null,
      accion: 'limpiar',
      modulo: 'bitacora',
      entidadTipo: 'bitacora',
      entidadId: '-',
      resumen: `Limpieza de bitácora: ${borradas} entradas anteriores a ${antesDe.toISOString().slice(0, 10)}${hayMas ? ' (quedan más, repetir)' : ''}`,
    });
    const q = new URLSearchParams();
    q.set('limpiadas', String(borradas));
    if (hayMas) q.set('hayMas', '1');
    res.redirect(`/app/bitacora?${q.toString()}`);
  };
}
