import type { Request, Response } from 'express';
import type { EmpresaService } from '../../../../application/empresas/EmpresaService.js';
import type { ContactoService } from '../../../../application/contactos/ContactoService.js';
import type { ITicketQueries } from '../../../../core/ports/repositories/ITicketQueries.js';

/** Papelera de reciclaje: entidades archivadas, con opción de restaurar. */
export class PapeleraController {
  constructor(
    private readonly empresas: EmpresaService,
    private readonly contactos: ContactoService,
    private readonly ticketQueries: ITicketQueries,
  ) {}

  ver = async (_req: Request, res: Response): Promise<void> => {
    const [empresas, contactos, tickets] = await Promise.all([
      this.empresas.listar({ activa: false }),
      this.contactos.listar({ activo: false }),
      this.ticketQueries.listar({ archivado: true }),
    ]);
    res.render('pages/backoffice/papelera', { titulo: 'Papelera', empresas, contactos, tickets });
  };
}
