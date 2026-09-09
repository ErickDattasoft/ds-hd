import type { Request, Response } from 'express';
import type { VersionService, FilaMercado } from '../../../../application/versiones/VersionService.js';
import type { ReporteVersionesService } from '../../../../application/versiones/ReporteVersionesService.js';
import type { EmpresaService } from '../../../../application/empresas/EmpresaService.js';
import type { IConfiguracionRepository } from '../../../../core/ports/repositories/IConfiguracionRepository.js';
import type { ContactoSoporte } from '../../../../core/entities/ConfiguracionAvisos.js';
import { camposDeError } from '../../support/errores.js';

const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const arr = (v: unknown): string[] =>
  Array.isArray(v) ? v.map(String) : v === undefined ? [] : [String(v)];

/** Un contacto de soporte por línea, formato `Nombre: Teléfono`. */
function contactosDeTexto(texto: string): ContactoSoporte[] {
  return texto
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const i = l.indexOf(':');
      return i === -1
        ? { nombre: l, telefono: '' }
        : { nombre: l.slice(0, i).trim(), telefono: l.slice(i + 1).trim() };
    });
}

/** Serializa contactos de soporte de vuelta a `Nombre: Teléfono` por línea, para el textarea. */
function contactosATexto(contactos: ContactoSoporte[]): string {
  return contactos.map((c) => (c.telefono ? `${c.nombre}: ${c.telefono}` : c.nombre)).join('\n');
}

/** Catálogo de versiones de sistemas. */
export class VersionController {
  constructor(
    private readonly versiones: VersionService,
    private readonly configuracion: IConfiguracionRepository,
    private readonly reporte: ReporteVersionesService,
    private readonly empresas: EmpresaService,
  ) {}

  // ── Grid "versiones del mercado" (edición masiva) ─────────────────────────
  mercadoView = async (_req: Request, res: Response): Promise<void> => {
    const { sistemas } = await this.configuracion.obtenerTickets();
    res.render('pages/backoffice/versiones/mercado', {
      titulo: 'Versiones del mercado',
      filas: await this.versiones.gridMercado(sistemas),
      guardado: false,
    });
  };

  mercadoPost = async (req: Request, res: Response): Promise<void> => {
    const b = req.body ?? {};
    const sistemas = arr(b.sistema);
    const version = arr(b.versionActual);
    const fecha = arr(b.fechaLiberacion);
    const descarga = arr(b.linkDescarga);
    const carta = arr(b.linkCartaTecnica);
    const filas: FilaMercado[] = sistemas.map((s, i) => ({
      sistema: s,
      versionActual: version[i] ?? '',
      fechaLiberacion: fecha[i] ?? '',
      linkDescarga: descarga[i] ?? '',
      linkCartaTecnica: carta[i] ?? '',
    }));
    await this.versiones.guardarMercado(req.user!, filas);
    const { sistemas: cat } = await this.configuracion.obtenerTickets();
    res.render('pages/backoffice/versiones/mercado', {
      titulo: 'Versiones del mercado',
      filas: await this.versiones.gridMercado(cat),
      guardado: true,
    });
  };

  // ── Reporte de desactualizadas ───────────────────────────────────────────
  private async datosReporte(empresaId: string) {
    const [filas, empresas] = await Promise.all([
      this.reporte.generar(empresaId ? { empresaId } : {}),
      this.empresas.listar({ activa: true }),
    ]);
    return { filas, empresas, empresaId };
  }

  reporteView = async (req: Request, res: Response): Promise<void> => {
    const empresaId = str(req.query.empresa);
    res.render('pages/backoffice/versiones/reporte', {
      titulo: 'Reporte de versiones y licencias desactualizadas',
      ...(await this.datosReporte(empresaId)),
      aviso: str(req.query.aviso) || null,
      errores: {},
    });
  };

  reporteImprimir = async (req: Request, res: Response): Promise<void> => {
    const empresaId = str(req.query.empresa);
    res.render('pages/backoffice/versiones/reporte-imprimir', {
      titulo: 'Reporte de desactualizadas',
      filas: await this.reporte.generar(empresaId ? { empresaId } : {}),
      auto: req.query.auto === '1',
    });
  };

  reporteExcel = async (req: Request, res: Response): Promise<void> => {
    const empresaId = str(req.query.empresa);
    const buffer = await this.reporte.exportarExcel(empresaId ? { empresaId } : {});
    const fecha = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Disposition', `attachment; filename="desactualizadas-${fecha}.xlsx"`);
    res.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet').send(buffer);
  };

  reporteEnviarPost = async (req: Request, res: Response): Promise<void> => {
    const b = req.body ?? {};
    const empresaId = str(b.empresa);
    const destinatarios = str(b.destinatarios)
      .split(/[\s,;]+/)
      .filter(Boolean);
    try {
      const { enviadoA } = await this.reporte.enviarPorCorreo(req.user!, {
        destinatarios,
        ...(empresaId ? { empresaId } : {}),
      });
      const q = new URLSearchParams({ aviso: `Enviado a ${enviadoA.join(', ')}` });
      if (empresaId) q.set('empresa', empresaId);
      res.redirect(`/app/versiones/reporte?${q.toString()}`);
    } catch (err) {
      res.status(422).render('pages/backoffice/versiones/reporte', {
        titulo: 'Reporte de versiones y licencias desactualizadas',
        ...(await this.datosReporte(empresaId)),
        aviso: null,
        errores: camposDeError(err),
      });
    }
  };

  private async renderAvisos(res: Response, guardado: boolean): Promise<void> {
    const config = await this.configuracion.obtenerAvisos();
    res.render('pages/backoffice/versiones/avisos', {
      titulo: 'Avisos de versiones y licencias',
      config,
      contactosVersionesTexto: contactosATexto(config.contactosSoporteVersiones),
      contactosLicenciasTexto: contactosATexto(config.contactosSoporteLicencias),
      guardado,
    });
  }

  avisosView = async (_req: Request, res: Response): Promise<void> => {
    await this.renderAvisos(res, false);
  };

  avisosPost = async (req: Request, res: Response): Promise<void> => {
    const b = req.body ?? {};
    await this.configuracion.guardarAvisos({
      plantillaVersiones: str(b.plantillaVersiones),
      plantillaLicencias: str(b.plantillaLicencias),
      contactosSoporteVersiones: contactosDeTexto(str(b.contactosSoporteVersiones)),
      contactosSoporteLicencias: contactosDeTexto(str(b.contactosSoporteLicencias)),
    });
    await this.renderAvisos(res, true);
  };

  listar = async (_req: Request, res: Response): Promise<void> => {
    const versiones = await this.versiones.listar();
    res.render('pages/backoffice/versiones/list', { titulo: 'Versiones de sistemas', versiones });
  };

  nuevo = (_req: Request, res: Response): void => {
    res.render('pages/backoffice/versiones/form', { titulo: 'Nueva versión', modo: 'crear', valores: {}, errores: {} });
  };

  editar = async (req: Request, res: Response): Promise<void> => {
    const version = await this.versiones.obtener(str(req.params.id));
    res.render('pages/backoffice/versiones/form', {
      titulo: `Editar ${version.sistema}`,
      modo: 'editar',
      version,
      valores: version,
      errores: {},
    });
  };

  guardarPost = async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id ? str(req.params.id) : undefined;
    const b = req.body ?? {};
    try {
      await this.versiones.guardar(
        req.user!,
        {
          sistema: str(b.sistema),
          versionActual: str(b.versionActual),
          fechaLiberacion: str(b.fechaLiberacion),
          notasVersion: str(b.notasVersion),
          linkDescarga: str(b.linkDescarga),
        },
        id,
      );
      res.redirect('/app/versiones');
    } catch (err) {
      res.status(422).render('pages/backoffice/versiones/form', {
        titulo: id ? 'Editar versión' : 'Nueva versión',
        modo: id ? 'editar' : 'crear',
        version: id ? { id } : null,
        valores: b,
        errores: camposDeError(err),
      });
    }
  };

  eliminarPost = async (req: Request, res: Response): Promise<void> => {
    await this.versiones.eliminar(req.user!, str(req.params.id));
    res.redirect('/app/versiones');
  };
}
