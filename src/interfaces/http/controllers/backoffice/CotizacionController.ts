import type { Request, Response } from 'express';
import type { CotizacionService } from '../../../../application/cotizaciones/CotizacionService.js';
import type { CalculadoraCompacService } from '../../../../application/cotizaciones/CalculadoraCompacService.js';
import type { EmpresaService } from '../../../../application/empresas/EmpresaService.js';
import type { ConceptoCotizacion, EstadoCotizacion } from '../../../../core/entities/Cotizacion.js';
import type { GrupoCompac } from '../../../../core/entities/CalculadoraCompac.js';
import { camposDeError } from '../../support/errores.js';

const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const arr = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : v === undefined ? [] : [String(v)]);
/** `YYYY-MM-DD` de un <input type="date"> → fecha a mediodía (evita que la zona horaria la mueva de día). */
const fechaDe = (v: unknown): Date | null => {
  const t = typeof v === 'string' ? v.trim() : '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return null;
  const d = new Date(`${t}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
};
const hoyIso = (): string => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' });
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
    // El estado se filtra por el que se VE (una enviada con vigencia pasada cuenta como vencida),
    // igual que el viejo; por eso se trae todo y se filtra aquí.
    const hoy = new Date();
    const todas = await this.cotizaciones.listar(texto ? { texto } : {});
    const conEstado = todas.map((c) => ({ c, visual: c.estadoVisual(hoy) }));
    const cotizaciones = conEstado
      .filter((x) => !estado || x.visual === estado)
      .map((x) => ({
        id: x.c.id,
        folio: x.c.folio,
        empresaNombre: x.c.empresaNombre,
        fecha: x.c.fecha,
        venceEl: x.c.venceEl,
        total: x.c.total,
        moneda: x.c.moneda,
        estado: x.visual,
        ticketId: x.c.ticketId,
        ticketNumero: x.c.ticketNumero,
      }));
    // Contadores del viejo: total, activas (borrador/enviada vigentes), aceptadas y vencidas.
    const contadores = {
      total: conEstado.length,
      activas: conEstado.filter((x) => x.visual === 'borrador' || x.visual === 'enviada').length,
      aceptadas: conEstado.filter((x) => x.visual === 'aceptada').length,
      vencidas: conEstado.filter((x) => x.visual === 'vencida').length,
    };
    res.render('pages/backoffice/cotizaciones/list', { titulo: 'Cotizaciones', cotizaciones, contadores, estado, q: texto });
  };

  ver = async (req: Request, res: Response): Promise<void> => {
    const cotizacion = await this.cotizaciones.obtener(str(req.params.id));
    res.render('pages/backoffice/cotizaciones/detail', {
      titulo: cotizacion.folio,
      cotizacion,
      estadoVisual: cotizacion.estadoVisual(new Date()),
      aviso: str(req.query.aviso) || null,
    });
  };

  nuevo = async (req: Request, res: Response): Promise<void> => {
    const empresas = await this.empresas.listar({ activa: true });
    const cfg = await this.cotizaciones.configModulo();
    res.render('pages/backoffice/cotizaciones/form', {
      titulo: 'Nueva cotización',
      empresas,
      catalogo: cfg.catalogoConceptos,
      valores: {
        empresaId: str(req.query.empresa),
        fechaIso: hoyIso(),
        conceptos: this.conceptosDesdeQuery(req),
        origenCalculadora: str(req.query.origen) === 'calculadora',
        // Desde «🧾 Cotizar» de un ticket: queda ligada a él y trae su contacto.
        ticketId: str(req.query.ticket),
        ticketNumero: str(req.query.ticketNumero),
        contactoNombre: str(req.query.contacto),
        contactoCorreo: str(req.query.correo),
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
      // "Busca o escribe una nueva" (como el viejo): si no se eligió empresa pero se escribió
      // un nombre, se da de alta en MAYÚSCULAS y la cotización queda con ella.
      let empresaId = str(b.empresaId);
      const empresaNueva = str(b.empresaNueva).trim().toUpperCase();
      if (!empresaId && empresaNueva) {
        const existente = (await this.empresas.listar({ texto: empresaNueva })).find(
          (e) => e.nombre.toUpperCase() === empresaNueva,
        );
        empresaId = existente?.id ?? (await this.empresas.crear(req.user!, { nombre: empresaNueva, rfc: str(b.rfc) })).id;
      }
      const cot = await this.cotizaciones.crear(req.user!, {
        empresaId,
        ...(fechaDe(b.fecha) ? { fecha: fechaDe(b.fecha)! } : {}),
        vigenciaDias: num(b.vigenciaDias) || 15,
        notas: str(b.notas),
        condiciones: str(b.condiciones),
        conceptos: this.conceptosDeBody(b),
        origenCalculadora: b.origenCalculadora === 'true',
        ...this.datosGeneralesDeBody(b),
        ...(str(b.ticketId) ? { ticketId: str(b.ticketId), ticketNumero: num(b.ticketNumero) || undefined } : {}),
      });
      res.redirect(this.destinoTrasGuardar(cot.id, b));
    } catch (err) {
      const empresas = await this.empresas.listar({ activa: true });
      res.status(422).render('pages/backoffice/cotizaciones/form', {
        titulo: 'Nueva cotización',
        empresas,
        catalogo: (await this.cotizaciones.configModulo()).catalogoConceptos,
        valores: { ...b, fechaIso: str(b.fecha), conceptos: this.conceptosDeBody(b) },
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
      catalogo: (await this.cotizaciones.configModulo()).catalogoConceptos,
      valores: {
        ...cotizacion,
        conceptos: cotizacion.conceptos,
        fechaIso: cotizacion.fecha.toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' }),
      },
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
        ...(fechaDe(b.fecha) ? { fecha: fechaDe(b.fecha)! } : {}),
        ...(num(b.vigenciaDias) > 0 ? { vigenciaDias: num(b.vigenciaDias) } : {}),
      });
      res.redirect(this.destinoTrasGuardar(id, b));
    } catch (err) {
      const cotizacion = await this.cotizaciones.obtener(id).catch(() => null);
      res.status(422).render('pages/backoffice/cotizaciones/form', {
        titulo: 'Editar cotización',
        modo: 'editar',
        cotizacion,
        empresas: [],
        catalogo: (await this.cotizaciones.configModulo()).catalogoConceptos,
        valores: { ...b, fechaIso: str(b.fecha), conceptos: this.conceptosDeBody(b) },
        errores: camposDeError(err),
      });
    }
  };

  cambiarEstadoPost = async (req: Request, res: Response): Promise<void> => {
    await this.cotizaciones.cambiarEstado(req.user!, str(req.params.id), str(req.body?.estado) as EstadoCotizacion);
    res.redirect(`/app/cotizaciones/${str(req.params.id)}`);
  };

  duplicarPost = async (req: Request, res: Response): Promise<void> => {
    const copia = await this.cotizaciones.duplicar(req.user!, str(req.params.id));
    res.redirect(`/app/cotizaciones/${copia.id}`);
  };

  eliminarPost = async (req: Request, res: Response): Promise<void> => {
    await this.cotizaciones.eliminar(req.user!, str(req.params.id));
    res.redirect('/app/cotizaciones');
  };

  imprimir = async (req: Request, res: Response): Promise<void> => {
    const cotizacion = await this.cotizaciones.obtener(str(req.params.id));
    res.render('pages/backoffice/cotizaciones/imprimir', {
      titulo: cotizacion.folio,
      cotizacion,
      auto: req.query.auto === '1',
      conLogo: req.query.logo !== '0',
      impresoEl: new Date(),
    });
  };

  enviarPost = async (req: Request, res: Response): Promise<void> => {
    const id = str(req.params.id);
    try {
      const { enviadoA } = await this.cotizaciones.enviarPorCorreo(req.user!, id, {
        para: str(req.body?.para) || undefined,
        asunto: str(req.body?.asunto) || undefined,
        mensaje: str(req.body?.mensaje) || undefined,
      });
      res.redirect(`/app/cotizaciones/${id}?aviso=${encodeURIComponent(`Enviada a ${enviadoA}`)}`);
    } catch (err) {
      const cotizacion = await this.cotizaciones.obtener(id).catch(() => null);
      res.status(422).render('pages/backoffice/cotizaciones/detail', {
        titulo: cotizacion?.folio ?? 'Cotización',
        cotizacion,
        estadoVisual: cotizacion?.estadoVisual(new Date()) ?? '',
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
    const grupos = this.gruposDeBody(b);
    const esperados = { servidores: num(b.esperadosServidores), terminales: num(b.esperadosTerminales) };
    try {
      const resultado = await this.calculadora.calcular(grupos);
      const avisos: string[] = [];
      if (esperados.servidores && esperados.servidores !== resultado.servidores) {
        avisos.push(`Servidores: capturaste ${resultado.servidores}, esperabas ${esperados.servidores}`);
      }
      if (esperados.terminales && esperados.terminales !== resultado.terminales) {
        avisos.push(`Terminales: capturaste ${resultado.terminales}, esperabas ${esperados.terminales}`);
      }
      const empresas = await this.empresas.listar({ activa: true });
      res.render('pages/backoffice/cotizaciones/calculadora-resultado', {
        titulo: 'Resultado de la calculadora',
        resultado,
        avisos,
        empresas,
      });
    } catch (err) {
      const config = await this.calculadora.config_();
      res.status(422).render('pages/backoffice/cotizaciones/calculadora', {
        titulo: 'Calculadora Compac',
        config,
        grupos,
        esperados,
        errores: camposDeError(err),
      });
    }
  };

  // ── helpers ──────────────────────────────────────────────────────────────
  /** «📄 Guardar y generar PDF» (como el viejo) abre la hoja para imprimir/guardar como PDF. */
  private destinoTrasGuardar(id: string, b: Record<string, unknown>): string {
    return b.accion === 'pdf' ? `/app/cotizaciones/${id}/imprimir?auto=1` : `/app/cotizaciones/${id}`;
  }

  private conceptosDeBody(b: Record<string, unknown>): ConceptoCotizacion[] {
    const desc = arr(b['concepto_descripcion']);
    const cant = arr(b['concepto_cantidad']);
    const precio = arr(b['concepto_precio']);
    const descuento = arr(b['concepto_descuento']);
    const iva = arr(b['concepto_iva']);
    return desc
      .map((d, i) => ({
        descripcion: d.trim(),
        cantidad: num(cant[i]) || 1,
        precioUnitario: num(precio[i]),
        descuento: Math.min(100, Math.max(0, num(descuento[i]))),
        importe: 0,
        // Un <select> por renglón ("1" con IVA / "0" sin IVA) para que el arreglo no se desalinee.
        tieneIva: iva[i] !== '0',
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

  /** Grupos `g_{i}_*` en el orden en que llegan (los índices los pone el navegador al agregar filas). */
  private gruposDeBody(b: Record<string, unknown>): GrupoCompac[] {
    return Object.keys(b)
      .map((k) => /^g_(\w+)_tipo$/.exec(k)?.[1])
      .filter((i): i is string => Boolean(i))
      .map((i) => ({
        tipo: str(b[`g_${i}_tipo`]),
        cantidad: Math.max(0, Math.floor(num(b[`g_${i}_cantidad`]))),
        sistemas: arr(b[`g_${i}_sistemas`]).filter(Boolean),
        incluyeSql: b[`g_${i}_sql`] === 'on',
      }));
  }
}
