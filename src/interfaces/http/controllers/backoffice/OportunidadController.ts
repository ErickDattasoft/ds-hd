import type { Request, Response } from 'express';
import type { OportunidadService, DatosOportunidad } from '../../../../application/ventas/OportunidadService.js';
import type { IEmpresaRepository } from '../../../../core/ports/repositories/IEmpresaRepository.js';
import type { IUsuarioRepository } from '../../../../core/ports/repositories/IUsuarioRepository.js';
import { ETAPAS_OPORTUNIDAD, ETIQUETA_ETAPA } from '../../../../core/entities/Oportunidad.js';
import { ROLES_STAFF } from '../../../../core/entities/value-objects/Rol.js';
import { camposDeError } from '../../support/errores.js';

const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const etapas = ETAPAS_OPORTUNIDAD.map((e) => ({ valor: e, etiqueta: ETIQUETA_ETAPA[e] }));

/** Embudo de ventas (`/app/ventas`). */
export class OportunidadController {
  constructor(
    private readonly oportunidades: OportunidadService,
    private readonly empresas: IEmpresaRepository,
    private readonly usuarios: IUsuarioRepository,
  ) {}

  private datos(b: Record<string, unknown>): DatosOportunidad {
    const fecha = str(b.cierreEstimado);
    return {
      titulo: str(b.titulo),
      empresaId: str(b.empresaId) || undefined,
      monto: Number(str(b.monto).replace(/[,$\s]/g, '') || 0),
      etapa: str(b.etapa),
      cierreEstimado: /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? new Date(`${fecha}T12:00:00-06:00`) : null,
      responsableUid: str(b.responsableUid) || undefined,
      cotizacionId: str(b.cotizacionId) || undefined,
      notas: str(b.notas),
    };
  }

  private async catalogos() {
    const [empresas, responsables] = await Promise.all([
      this.empresas.list({ activa: true }),
      this.usuarios.list({ roles: [...ROLES_STAFF], activo: true }),
    ]);
    return { empresas, responsables, etapas };
  }

  embudo = async (req: Request, res: Response): Promise<void> => {
    const responsableUid = str(req.query.responsable);
    const [embudo, cat] = await Promise.all([
      this.oportunidades.embudo(req.user!, responsableUid ? { responsableUid } : {}),
      this.catalogos(),
    ]);
    res.render('pages/backoffice/ventas/embudo', { titulo: 'Embudo de ventas', embudo, responsableUid, ...cat });
  };

  nuevo = async (req: Request, res: Response): Promise<void> => {
    res.render('pages/backoffice/ventas/form', {
      titulo: 'Nueva oportunidad',
      modo: 'crear',
      valores: {
        empresaId: str(req.query.empresa),
        cotizacionId: str(req.query.cotizacion),
        titulo: str(req.query.titulo),
        monto: str(req.query.monto),
        etapa: str(req.query.cotizacion) ? 'propuesta' : 'prospecto',
        responsableUid: req.user!.uid,
      },
      errores: {},
      ...(await this.catalogos()),
    });
  };

  crearPost = async (req: Request, res: Response): Promise<void> => {
    try {
      await this.oportunidades.crear(req.user!, this.datos(req.body ?? {}));
      res.redirect('/app/ventas');
    } catch (err) {
      res.status(422).render('pages/backoffice/ventas/form', {
        titulo: 'Nueva oportunidad',
        modo: 'crear',
        valores: req.body ?? {},
        errores: camposDeError(err),
        ...(await this.catalogos()),
      });
    }
  };

  editar = async (req: Request, res: Response): Promise<void> => {
    const o = await this.oportunidades.obtener(str(req.params.id));
    res.render('pages/backoffice/ventas/form', {
      titulo: 'Editar oportunidad',
      modo: 'editar',
      oportunidad: o,
      valores: { ...o, cierreEstimado: o.cierreEstimado ? o.cierreEstimado.toISOString().slice(0, 10) : '' },
      errores: {},
      ...(await this.catalogos()),
    });
  };

  actualizarPost = async (req: Request, res: Response): Promise<void> => {
    const id = str(req.params.id);
    try {
      await this.oportunidades.actualizar(req.user!, id, this.datos(req.body ?? {}));
      res.redirect('/app/ventas');
    } catch (err) {
      res.status(422).render('pages/backoffice/ventas/form', {
        titulo: 'Editar oportunidad',
        modo: 'editar',
        oportunidad: await this.oportunidades.obtener(id),
        valores: req.body ?? {},
        errores: camposDeError(err),
        ...(await this.catalogos()),
      });
    }
  };

  moverPost = async (req: Request, res: Response): Promise<void> => {
    await this.oportunidades.mover(req.user!, str(req.params.id), str(req.body?.etapa), str(req.body?.motivoPerdida));
    res.redirect(`/app/ventas${str(req.body?.volver).startsWith('?') ? str(req.body?.volver) : ''}`);
  };

  eliminarPost = async (req: Request, res: Response): Promise<void> => {
    await this.oportunidades.eliminar(req.user!, str(req.params.id));
    res.redirect('/app/ventas');
  };
}
