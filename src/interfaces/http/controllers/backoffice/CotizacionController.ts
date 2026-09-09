import type { Request, Response } from 'express';
import type { CotizacionService } from '../../../../application/cotizaciones/CotizacionService.js';
import type { CalculadoraCompacService } from '../../../../application/cotizaciones/CalculadoraCompacService.js';
import type { EmpresaService } from '../../../../application/empresas/EmpresaService.js';
import type { ConceptoCotizacion, EstadoCotizacion } from '../../../../core/entities/Cotizacion.js';
import type { EquipoInput, TipoEquipo } from '../../../../core/entities/CalculadoraCompac.js';
import { camposDeError } from '../../support/errores.js';

const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const arr = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : v === undefined ? [] : [String(v)]);
const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** Cotizaciones + Calculadora Compac. */
export class CotizacionController {
  constructor(
    private readonly cotizaciones: CotizacionService,
    private readonly calculadora: CalculadoraCompacService,
    private readonly empresas: EmpresaService,
  ) {}

  listar = async (req: Request, res: Response): Promise<void> => {
    const estado = str(req.query.estado) as EstadoCotizacion | '';
    const texto = str(req.query.q);
    const cots = await this.cotizaciones.listar({
      ...(estado ? { estado } : {}),
      ...(texto ? { texto } : {}),
    });
    res.render('pages/backoffice/cotizaciones/list', { titulo: 'Cotizaciones', cotizaciones: cots, estado, q: texto });
  };

  ver = async (req: Request, res: Response): Promise<void> => {
    const cotizacion = await this.cotizaciones.obtener(str(req.params.id));
    res.render('pages/backoffice/cotizaciones/detail', {
      titulo: cotizacion.folio,
      cotizacion,
      aviso: str(req.query.aviso) || null,
    });
  };

  nuevo = async (req: Request, res: Response): Promise<void> => {
    const empresas = await this.empresas.listar({ activa: true });
    const cfg = await this.cotizaciones.configModulo();
    res.render('pages/backoffice/cotizaciones/form', {
      titulo: 'Nueva cotización',
      empresas,
      valores: {
        empresaId: str(req.query.empresa),
        conceptos: this.conceptosDesdeQuery(req),
        condiciones: cfg.condicionesPorDefecto,
        emisorNombre: req.user!.nombre,
        emisorCargo: cfg.emisorCargoPorDefecto,
        emisorTelefono: cfg.emisorTelefonoPorDefecto,
        emisorCorreo: req.user!.email,
      },
      errores: {},
    });
  };

  private datosGeneralesDeBody(b: Record<string, unknown>): Record<string, string> {
    return {
      emisorNombre: str(b.emisorNombre),
      emisorCargo: str(b.emisorCargo),
      emisorTelefono: str(b.emisorTelefono),
      emisorCorreo: str(b.emisorCorreo),
      rfc: str(b.rfc),
      contactoNombre: str(b.contactoNombre),
      contactoCorreo: str(b.contactoCorreo),
      contactoTelefono: str(b.contactoTelefono),
    };
  }

  crearPost = async (req: Request, res: Response): Promise<void> => {
    const b = req.body ?? {};
    try {
      const cot = await this.cotizaciones.crear(req.user!, {
        empresaId: str(b.empresaId),
        vigenciaDias: num(b.vigenciaDias) || 15,
        notas: str(b.notas),
        condiciones: str(b.condiciones),
        conceptos: this.conceptosDeBody(b),
        origenCalculadora: b.origenCalculadora === 'true',
        ...this.datosGeneralesDeBody(b),
      });
      res.redirect(`/app/cotizaciones/${cot.id}`);
    } catch (err) {
      const empresas = await this.empresas.listar({ activa: true });
      res.status(422).render('pages/backoffice/cotizaciones/form', {
        titulo: 'Nueva cotización',
        empresas,
        valores: { ...b, conceptos: this.conceptosDeBody(b) },
        errores: camposDeError(err),
      });
    }
  };

  editar = async (req: Request, res: Response): Promise<void> => {
    const cotizacion = await this.cotizaciones.obtener(str(req.params.id));
    res.render('pages/backoffice/cotizaciones/form', {
      titulo: `Editar ${cotizacion.folio}`,
      modo: 'editar',
      cotizacion,
      empresas: [],
      valores: { ...cotizacion, conceptos: cotizacion.conceptos },
      errores: {},
    });
  };

  actualizarPost = async (req: Request, res: Response): Promise<void> => {
    const id = str(req.params.id);
    const b = req.body ?? {};
    try {
      await this.cotizaciones.actualizarConceptos(req.user!, id, {
        conceptos: this.conceptosDeBody(b),
        notas: str(b.notas),
        condiciones: str(b.condiciones),
        ...this.datosGeneralesDeBody(b),
      });
      res.redirect(`/app/cotizaciones/${id}`);
    } catch (err) {
      const cotizacion = await this.cotizaciones.obtener(id).catch(() => null);
      res.status(422).render('pages/backoffice/cotizaciones/form', {
        titulo: 'Editar cotización',
        modo: 'editar',
        cotizacion,
        empresas: [],
        valores: { ...b, conceptos: this.conceptosDeBody(b) },
        errores: camposDeError(err),
      });
    }
  };

  cambiarEstadoPost = async (req: Request, res: Response): Promise<void> => {
    await this.cotizaciones.cambiarEstado(req.user!, str(req.params.id), str(req.body?.estado) as EstadoCotizacion);
    res.redirect(`/app/cotizaciones/${str(req.params.id)}`);
  };

  imprimir = async (req: Request, res: Response): Promise<void> => {
    const cotizacion = await this.cotizaciones.obtener(str(req.params.id));
    res.render('pages/backoffice/cotizaciones/imprimir', {
      titulo: cotizacion.folio,
      cotizacion,
      auto: req.query.auto === '1',
    });
  };

  enviarPost = async (req: Request, res: Response): Promise<void> => {
    const id = str(req.params.id);
    try {
      const { enviadoA } = await this.cotizaciones.enviarPorCorreo(req.user!, id, {
        para: str(req.body?.para) || undefined,
      });
      res.redirect(`/app/cotizaciones/${id}?aviso=${encodeURIComponent(`Enviada a ${enviadoA}`)}`);
    } catch (err) {
      const cotizacion = await this.cotizaciones.obtener(id).catch(() => null);
      res.status(422).render('pages/backoffice/cotizaciones/detail', {
        titulo: cotizacion?.folio ?? 'Cotización',
        cotizacion,
        errorEnvio: camposDeError(err).para ?? camposDeError(err).general ?? 'No se pudo enviar',
      });
    }
  };

  crearTicketPost = async (req: Request, res: Response): Promise<void> => {
    const ticket = await this.cotizaciones.crearTicketSeguimiento(req.user!, str(req.params.id));
    res.redirect(`/app/tickets/${ticket.id}`);
  };

  // ── Calculadora Compac ────────────────────────────────────────────────────
  calculadoraForm = async (_req: Request, res: Response): Promise<void> => {
    const config = await this.calculadora.config_();
    res.render('pages/backoffice/cotizaciones/calculadora', { titulo: 'Calculadora Compac', config, errores: {} });
  };

  calcularPost = async (req: Request, res: Response): Promise<void> => {
    const b = req.body ?? {};
    const equipos = this.equiposDeBody(b);
    try {
      const resultado = await this.calculadora.calcular(equipos);
      const empresas = await this.empresas.listar({ activa: true });
      res.render('pages/backoffice/cotizaciones/calculadora-resultado', {
        titulo: 'Resultado de la calculadora',
        resultado,
        empresas,
      });
    } catch (err) {
      const config = await this.calculadora.config_();
      res.status(422).render('pages/backoffice/cotizaciones/calculadora', {
        titulo: 'Calculadora Compac',
        config,
        errores: camposDeError(err),
      });
    }
  };

  // ── helpers ──────────────────────────────────────────────────────────────
  private conceptosDeBody(b: Record<string, unknown>): ConceptoCotizacion[] {
    const desc = arr(b['concepto_descripcion']);
    const cant = arr(b['concepto_cantidad']);
    const precio = arr(b['concepto_precio']);
    return desc
      .map((d, i) => ({
        descripcion: d.trim(),
        cantidad: num(cant[i]) || 1,
        precioUnitario: num(precio[i]),
        importe: 0,
      }))
      .filter((c) => c.descripcion.length > 0);
  }

  private conceptosDesdeQuery(req: Request): ConceptoCotizacion[] {
    try {
      const raw = str(req.query.conceptos);
      return raw ? (JSON.parse(raw) as ConceptoCotizacion[]) : [];
    } catch {
      return [];
    }
  }

  private equiposDeBody(b: Record<string, unknown>): EquipoInput[] {
    const equipos: EquipoInput[] = [];
    for (let i = 0; i < 4; i++) {
      if (b[`equipo_${i}_usar`] !== 'on') continue;
      const sistemas = arr(b[`equipo_${i}_sistemas`]);
      if (sistemas.length === 0) continue;
      const tipo = str(b[`equipo_${i}_tipo`]) as TipoEquipo;
      equipos.push({ tipo: tipo === 'Servidor' ? 'Servidor' : 'Terminal', sistemas });
    }
    return equipos;
  }
}
