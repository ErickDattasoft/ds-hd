import type { Request, Response } from 'express';
import type { EmpresaService } from '../../../../application/empresas/EmpresaService.js';
import type { ContactoService } from '../../../../application/contactos/ContactoService.js';
import type { ITicketQueries } from '../../../../core/ports/repositories/ITicketQueries.js';
import { PapeleraService, type TipoPapelera } from '../../../../application/papelera/PapeleraService.js';

const ids = (v: unknown): string[] => ([] as string[]).concat((v ?? []) as string[]).filter(Boolean);

/** Papelera de reciclaje: restaurar (múltiple), eliminar definitivo y vaciar. */
export class PapeleraController {
  constructor(
    private readonly empresas: EmpresaService,
    private readonly contactos: ContactoService,
    private readonly ticketQueries: ITicketQueries,
    private readonly papelera: PapeleraService,
  ) {}

  ver = async (req: Request, res: Response): Promise<void> => {
    const [empresas, contactos, tickets] = await Promise.all([
      this.empresas.listar({ activa: false }),
      this.contactos.listar({ activo: false }),
      this.ticketQueries.listar({ archivado: true }),
    ]);
    res.render('pages/backoffice/papelera', {
      titulo: 'Papelera',
      empresas,
      contactos,
      tickets,
      aviso: typeof req.query.aviso === 'string' ? req.query.aviso : null,
    });
  };

  restaurarPost = async (req: Request, res: Response): Promise<void> => {
    const tipo = this.tipo(req);
    const r = await this.papelera.restaurar(req.user!, tipo, ids(req.body?.ids));
    this.volver(res, `Restaurados: ${r.ok}${r.errores ? `, con ${r.errores} error(es)` : ''}.`);
  };

  eliminarPost = async (req: Request, res: Response): Promise<void> => {
    const tipo = this.tipo(req);
    const r = await this.papelera.eliminar(req.user!, tipo, ids(req.body?.ids));
    this.volver(res, `Eliminados definitivamente: ${r.ok}${r.errores ? `, con ${r.errores} error(es)` : ''}.`);
  };

  vaciarPost = async (req: Request, res: Response): Promise<void> => {
    const tipo = this.tipo(req);
    const r = await this.papelera.vaciar(req.user!, tipo);
    this.volver(res, `Papelera de ${tipo} vaciada: ${r.ok} elemento(s) borrado(s).`);
  };

  private tipo(req: Request): TipoPapelera {
    const t = req.body?.tipo;
    if (!PapeleraService.esTipo(t)) throw new Error(`Tipo de papelera inválido: ${String(t)}`);
    return t;
  }

  private volver(res: Response, aviso: string): void {
    res.redirect(`/app/papelera?aviso=${encodeURIComponent(aviso)}`);
  }
}
