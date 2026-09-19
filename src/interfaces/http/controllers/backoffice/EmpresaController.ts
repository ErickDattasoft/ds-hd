import type { Request, Response } from 'express';
import type { EmpresaService } from '../../../../application/empresas/EmpresaService.js';
import type { AvisarEmpresasService } from '../../../../application/empresas/AvisarEmpresasService.js';
import type { EmpresaExcelService } from '../../../../application/empresas/EmpresaExcelService.js';
import type { ICotizacionRepository } from '../../../../core/ports/repositories/ICotizacionRepository.js';
import type { FiltrosGuardadosService } from '../../../../application/shared/FiltrosGuardadosService.js';
import type { ContactoService } from '../../../../application/contactos/ContactoService.js';
import type { SeguimientoService } from '../../../../application/seguimiento/SeguimientoService.js';
import type { VersionService } from '../../../../application/versiones/VersionService.js';
import type { ITicketQueries } from '../../../../core/ports/repositories/ITicketQueries.js';
import type { Interaccion, TipoInteraccion } from '../../../../core/entities/Interaccion.js';
import type { Ticket } from '../../../../core/entities/Ticket.js';
import { estadoActualizacion } from '../../../../core/entities/value-objects/version.js';
import { formatearLicenciasPendientes } from '../../../../application/empresas/avisos.js';
import { camposDeError } from '../../support/errores.js';

/** Un renglón del historial combinado de la empresa (interacción o ticket). */
interface ItemHistorial {
  tipo: TipoInteraccion | 'ticket';
  fecha: Date;
  texto: string;
  usuario: string | null;
  ticketId?: string;
  ticketEstado?: string;
}

const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const lista = (v: unknown): string[] =>
  str(v)
    .split(/\r?\n|,/)
    .map((s) => s.trim())
    .filter(Boolean);

/** Extrae un mapa `{sistema → valor}` de los campos `prefijo:Sistema` del body. */
const mapaConPrefijo = (b: Record<string, unknown>, prefijo: string): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const [clave, valor] of Object.entries(b)) {
    if (clave.startsWith(prefijo) && typeof valor === 'string' && valor.trim()) {
      out[clave.slice(prefijo.length)] = valor.trim();
    }
  }
  return out;
};

/** CRUD de empresas. */
export class EmpresaController {
  constructor(
    private readonly empresas: EmpresaService,
    private readonly contactos: ContactoService,
    private readonly ticketQueries: ITicketQueries,
    private readonly seguimiento: SeguimientoService,
    private readonly versiones: VersionService,
    private readonly avisar: AvisarEmpresasService,
    private readonly excel: EmpresaExcelService,
    private readonly filtrosGuardados: FiltrosGuardadosService,
    private readonly cotizaciones: ICotizacionRepository,
  ) {}

  listar = async (req: Request, res: Response): Promise<void> => {
    const texto = str(req.query.q);
    const incluirArchivadas = req.query.archivadas === '1';
    const soloPendientes = req.query.pendientes === '1';
    const soloFavoritas = req.query.favoritas === '1';
    const sistema = str(req.query.sistema);
    const [empresas, versiones, filtrosGuardados, todosLosContactos] = await Promise.all([
      this.empresas.listar({
        ...(texto ? { texto } : {}),
        ...(incluirArchivadas ? {} : { activa: true }),
        ...(soloFavoritas ? { favorita: true } : {}),
        ...(sistema ? { sistema } : {}),
      }),
      this.versiones.listar(),
      this.filtrosGuardados.listar(req.user!, 'empresas'),
      this.contactos.listar({ activo: true }),
    ]);
    const oficial = this.mapaOficial(versiones);
    // Contacto principal de cada empresa, para mostrarlo en la lista como en el CRM viejo: el
    // marcado como principal y, si no hay ninguno, el primero de la empresa.
    const contactoPorEmpresa = new Map<string, { nombre: string; email: string | null }>();
    for (const c of todosLosContactos) {
      const actual = contactoPorEmpresa.get(c.empresaId);
      const esPrincipal = empresas.some((e) => e.contactoPrincipalId === c.id);
      if (!actual || esPrincipal) contactoPorEmpresa.set(c.empresaId, { nombre: c.nombre, email: c.email });
    }
    const sistemasDisponibles = [
      ...new Set([
        ...versiones.map((v) => v.sistema),
        ...empresas.flatMap((e) => e.sistemasContratados),
      ]),
    ].sort((a, b) => a.localeCompare(b, 'es'));
    const hoy = new Date();
    let filas = empresas.map((empresa) => {
      const riesgo = empresa.licenciasEnRiesgo(hoy);
      return {
        empresa,
        contactoPrincipal: contactoPorEmpresa.get(empresa.id) ?? null,
        vencidas: riesgo.filter((l) => l.estado === 'vencida').length,
        porVencer: riesgo.filter((l) => l.estado === 'por_vencer').length,
        desactualizadas: empresa.sistemasContratados.filter(
          (s) => estadoActualizacion(empresa.versionesInstaladas[s], oficial[s]) === 'desactualizada',
        ).length,
        detalleLicencias: riesgo.length ? formatearLicenciasPendientes(empresa, hoy) : '',
      };
    });
    if (soloPendientes) {
      filas = filas.filter((f) => f.vencidas || f.porVencer || f.desactualizadas);
    }
    // Las favoritas van arriba, como en el CRM viejo: marcar una empresa es justamente decir
    // "a esta la quiero a la mano". Dentro de cada grupo se mantiene el orden que ya traía el
    // repositorio, para que la lista no cambie de criterio a media tabla.
    //
    // `orden` guarda la posición ANTES de subir las favoritas: el navegador la usa para
    // reacomodar la fila en el momento de marcarla o desmarcarla (sin recargar) y llegar
    // exactamente a la misma lista que devolvería el servidor.
    const conOrden = filas.map((f, orden) => ({ ...f, orden }));
    conOrden.sort((a, b) => Number(b.empresa.favorita) - Number(a.empresa.favorita));
    // Contadores de los botones de aviso, como en el CRM viejo: cuántas empresas tienen algo
    // pendiente, para saber si vale la pena abrirlos sin tener que filtrar primero.
    const conLicencias = conOrden.filter((f) => f.vencidas || f.porVencer).length;
    const conVersiones = conOrden.filter((f) => f.desactualizadas).length;
    res.render('pages/backoffice/empresas/list', {
      titulo: 'Empresas',
      filas: conOrden,
      conLicencias,
      conVersiones,
      q: texto,
      incluirArchivadas,
      soloPendientes,
      soloFavoritas,
      sistema,
      sistemasDisponibles,
      filtrosGuardados,
      error: str(req.query.error) || null,
    });
  };

  favoritaPost = async (req: Request, res: Response): Promise<void> => {
    const id = str(req.params.id);
    await this.empresas.alternarFavorita(req.user!, id, req.body?.favorita === 'true');
    // app.js lo manda por fetch: sin redirect para no recargar (y releer) toda la lista.
    if (req.get('X-Requested-With') === 'fetch') {
      res.status(204).end();
      return;
    }
    const volver = str(req.body?.volver);
    res.redirect(volver.startsWith('/app/') ? volver : `/app/empresas/${id}`);
  };

  /** Paso 1: muestra los pendientes de cada empresa para elegir cuáles mencionar. */
  avisarPost = async (req: Request, res: Response): Promise<void> => {
    const { tipo, canal } = this.tipoCanal(req);
    const empresaIds = ([] as string[]).concat(req.body?.empresaIds ?? []).filter(Boolean);
    res.render('pages/backoffice/empresas/avisar-seleccion', {
      titulo: 'Elegir qué avisar',
      tipo,
      canal,
      filas: empresaIds.length ? await this.avisar.pendientes(req.user!, empresaIds, tipo) : [],
    });
  };

  private tipoCanal(req: Request): { tipo: 'versiones' | 'licencias'; canal: 'correo' | 'whatsapp' } {
    const [tipoRaw, canalRaw] = str(req.body?.accion).split('-');
    return {
      tipo: tipoRaw === 'licencias' ? 'licencias' : 'versiones',
      canal: canalRaw === 'whatsapp' ? 'whatsapp' : 'correo',
    };
  }

  /** Paso 2: envía solo los sistemas marcados (`sel_<empresaId>`). */
  avisarConfirmarPost = async (req: Request, res: Response): Promise<void> => {
    const { tipo, canal } = this.tipoCanal(req);
    const b = (req.body ?? {}) as Record<string, unknown>;
    const empresaIds = ([] as string[]).concat((b.empresaIds as string[]) ?? []).filter(Boolean);
    const seleccion: Record<string, string[]> = {};
    for (const id of empresaIds) {
      seleccion[id] = ([] as string[]).concat((b[`sel_${id}`] as string[]) ?? []).filter(Boolean);
    }
    const resultados = empresaIds.length
      ? await this.avisar.ejecutar({ actor: req.user!, empresaIds, tipo, canal, seleccion })
      : [];
    res.render('pages/backoffice/empresas/avisar-resultado', {
      titulo: 'Resultado del aviso',
      tipo,
      canal,
      resultados,
    });
  };

  nuevo = (_req: Request, res: Response): void => {
    res.render('pages/backoffice/empresas/form', { titulo: 'Nueva empresa', modo: 'crear', valores: {}, errores: {} });
  };

  crearPost = async (req: Request, res: Response): Promise<void> => {
    const b = req.body ?? {};
    try {
      const e = await this.empresas.crear(req.user!, this.datos(b));
      // Primer contacto opcional en el mismo paso — como el CRM viejo ("Contactos de esta
      // empresa" en su form de alta). Si falla (p. ej. sin permiso contactos:crear), la empresa
      // ya quedó creada; no se revierte por un campo secundario opcional.
      const contactoNombre = str(b.contactoNombre).trim();
      if (contactoNombre.length >= 2) {
        try {
          await this.contactos.crear(req.user!, {
            nombre: contactoNombre,
            empresaId: e.id,
            puesto: str(b.contactoPuesto),
            email: str(b.contactoEmail),
            telefono: str(b.contactoTelefono),
            celular: str(b.contactoCelular),
          });
        } catch {
          // opcional — la empresa ya se creó, no se bloquea el flujo por esto.
        }
      }
      res.redirect(`/app/empresas/${e.id}`);
    } catch (err) {
      res.status(422).render('pages/backoffice/empresas/form', {
        titulo: 'Nueva empresa',
        modo: 'crear',
        valores: b,
        errores: camposDeError(err),
      });
    }
  };

  ver = async (req: Request, res: Response): Promise<void> => {
    const id = str(req.params.id);
    const empresa = await this.empresas.obtener(id);
    const filtroHistorial = { desde: str(req.query.hDesde), hasta: str(req.query.hHasta), tipo: str(req.query.hTipo) };
    const puedeVerCotizaciones = req.user!.permisos.includes('cotizaciones:leer');
    const [contactos, tickets, todosLosTickets, interacciones, versiones, tareas, cotizaciones] = await Promise.all([
      this.contactos.listar({ empresaId: id }),
      this.ticketQueries.listar({ empresaId: id, limite: 20, archivado: false }),
      this.ticketQueries.listar({ empresaId: id }),
      this.seguimiento.interaccionesDe(id),
      this.versiones.listar(),
      this.seguimiento.listarTareas({ empresaId: id, completada: false }),
      puedeVerCotizaciones ? this.cotizaciones.list({ empresaId: id }) : Promise.resolve([]),
    ]);
    const oficial = this.mapaOficial(versiones);
    const hoy = new Date();
    const { historial, resumenTickets } = this.construirHistorial(interacciones, todosLosTickets, filtroHistorial);
    res.render('pages/backoffice/empresas/detail', {
      titulo: empresa.nombre,
      empresa,
      contactos,
      tickets,
      historial,
      resumenTickets,
      filtroHistorial,
      tareas,
      cotizaciones,
      sistemas: empresa.sistemasContratados.map((sistema) => ({
        sistema,
        vigencia: empresa.vigencias[sistema] ?? null,
        estadoVigencia: empresa.estadoVigencia(sistema, hoy),
        instalada: empresa.versionesInstaladas[sistema] ?? null,
        oficial: oficial[sistema] ?? null,
        estadoVersion: estadoActualizacion(empresa.versionesInstaladas[sistema], oficial[sistema]),
      })),
    });
  };

  /**
   * Historial combinado (interacciones + una fila por ticket, no por cada evento de su
   * actividad) con filtro de fecha/tipo, más un resumen por estado cuando se filtra
   * tipo=ticket — mismo criterio que el CRM viejo.
   */
  private construirHistorial(
    interacciones: Interaccion[],
    tickets: Ticket[],
    filtro: { desde: string; hasta: string; tipo: string },
  ): { historial: ItemHistorial[]; resumenTickets: { estado: string; cantidad: number }[] | null } {
    let items: ItemHistorial[] = [
      ...interacciones.map((i) => ({ tipo: i.tipo, fecha: i.fecha, texto: i.resumen, usuario: i.creadoPorNombre })),
      ...tickets.map((t) => ({
        tipo: 'ticket' as const,
        fecha: t.abiertoEn,
        texto: `#${t.numero} ${t.asunto} — Estado: ${t.estado}`,
        usuario: null,
        ticketId: t.id,
        ticketEstado: t.estado,
      })),
    ];
    items.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
    if (filtro.desde) items = items.filter((it) => it.fecha >= new Date(filtro.desde + 'T00:00:00'));
    if (filtro.hasta) items = items.filter((it) => it.fecha <= new Date(filtro.hasta + 'T23:59:59'));
    if (filtro.tipo) items = items.filter((it) => it.tipo === filtro.tipo);

    let resumenTickets: { estado: string; cantidad: number }[] | null = null;
    if (filtro.tipo === 'ticket' && items.length) {
      const conteo = new Map<string, number>();
      for (const it of items) conteo.set(it.ticketEstado ?? '—', (conteo.get(it.ticketEstado ?? '—') ?? 0) + 1);
      resumenTickets = [...conteo].map(([estado, cantidad]) => ({ estado, cantidad }));
    }
    return { historial: items, resumenTickets };
  }

  editar = async (req: Request, res: Response): Promise<void> => {
    const empresa = await this.empresas.obtener(str(req.params.id));
    res.render('pages/backoffice/empresas/form', {
      titulo: `Editar ${empresa.nombre}`,
      modo: 'editar',
      empresa,
      valores: { ...empresa, sistemasContratados: empresa.sistemasContratados.join('\n') },
      errores: {},
    });
  };

  actualizarPost = async (req: Request, res: Response): Promise<void> => {
    const id = str(req.params.id);
    const b = req.body ?? {};
    try {
      await this.empresas.actualizar(req.user!, id, this.datos(b));
      res.redirect(`/app/empresas/${id}`);
    } catch (err) {
      const empresa = await this.empresas.obtener(id).catch(() => null);
      res.status(422).render('pages/backoffice/empresas/form', {
        titulo: 'Editar empresa',
        modo: 'editar',
        empresa,
        valores: b,
        errores: camposDeError(err),
      });
    }
  };

  archivarPost = async (req: Request, res: Response): Promise<void> => {
    await this.empresas.archivar(req.user!, str(req.params.id), req.body?.archivar !== 'false');
    // Se vuelve a la lista tal como estaba (filtros y búsqueda incluidos) cuando la acción sale
    // de ahí; desde la ficha no viene `volver` y se cae al listado sin filtros, como antes.
    const volver = str(req.body?.volver);
    res.redirect(volver.startsWith('/app/') ? volver : '/app/empresas');
  };

  exportarExcel = async (req: Request, res: Response): Promise<void> => {
    const texto = str(req.query.q);
    const buffer = await this.excel.exportar({
      ...(texto ? { texto } : {}),
      ...(req.query.archivadas === '1' ? {} : { activa: true }),
    });
    const fecha = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Disposition', `attachment; filename="empresas-${fecha}.xlsx"`);
    res.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet').send(buffer);
  };

  importarView = (_req: Request, res: Response): void => {
    res.render('pages/backoffice/empresas/importar', { titulo: 'Importar empresas' });
  };

  /** El archivo llega por `fetch` con `FormData` (CSRF vía cabecera `x-csrf-token`, no campo de
   * formulario — el body multipart aún no está parseado cuando corre el chequeo global de CSRF). */
  importarPost = async (req: Request, res: Response): Promise<void> => {
    const archivo = req.file;
    if (!archivo) {
      res.status(422).json({ ok: false, error: 'Selecciona un archivo .xlsx' });
      return;
    }
    try {
      const resultado = await this.excel.importar(req.user!, archivo.buffer);
      res.json({ ok: true, resultado });
    } catch (err) {
      res.status(422).json({ ok: false, error: err instanceof Error ? err.message : 'No se pudo importar el archivo' });
    }
  };

  /** Versión oficial vigente por sistema (última si hay varias del mismo sistema). */
  private mapaOficial(versiones: { sistema: string; versionActual: string }[]): Record<string, string> {
    const out: Record<string, string> = {};
    for (const v of versiones) out[v.sistema] = v.versionActual;
    return out;
  }

  private datos(b: Record<string, unknown>) {
    return {
      nombre: str(b.nombre),
      rfc: str(b.rfc),
      razonSocial: str(b.razonSocial),
      direccion: str(b.direccion),
      telefono: str(b.telefono),
      email: str(b.email),
      sistemasContratados: lista(b.sistemasContratados),
      vigencias: mapaConPrefijo(b, 'vigencia:'),
      versionesInstaladas: mapaConPrefijo(b, 'version:'),
      camposExtra: this.camposExtra(b),
      notas: str(b.notas),
    };
  }

  private camposExtra(b: Record<string, unknown>): { etiqueta: string; valor: string }[] {
    const et = ([] as unknown[]).concat(b.campoExtraEtiqueta ?? []).map(String);
    const va = ([] as unknown[]).concat(b.campoExtraValor ?? []).map(String);
    return et.map((etiqueta, i) => ({ etiqueta, valor: va[i] ?? '' })).filter((c) => c.etiqueta || c.valor);
  }
}
