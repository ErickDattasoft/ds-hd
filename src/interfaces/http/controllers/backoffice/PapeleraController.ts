import type { Request, Response } from 'express';
import type { EmpresaService } from '../../../../application/empresas/EmpresaService.js';
import type { ContactoService } from '../../../../application/contactos/ContactoService.js';

/** Papelera de reciclaje: entidades archivadas, con opción de restaurar. */
export class PapeleraController {
  constructor(
    private readonly empresas: EmpresaService,
    private readonly contactos: ContactoService,
  ) {}

  ver = async (_req: Request, res: Response): Promise<void> => {
    const [empresas, contactos] = await Promise.all([
      this.empresas.listar({ activa: false }),
      this.contactos.listar({ activo: false }),
    ]);
    res.render('pages/backoffice/papelera', { titulo: 'Papelera', empresas, contactos });
  };
}
