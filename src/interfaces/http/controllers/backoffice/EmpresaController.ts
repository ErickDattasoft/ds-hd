import type { Request, Response } from 'express';
import type { EmpresaService } from '../../../../application/empresas/EmpresaService.js';
import type { AvisarEmpresasService } from '../../../../application/empresas/AvisarEmpresasService.js';
import type { EmpresaExcelService } from '../../../../application/empresas/EmpresaExcelService.js';
import type { FiltrosGuardadosService } from '../../../../application/shared/FiltrosGuardadosService.js';
import type { ContactoService } from '../../../../application/contactos/ContactoService.js';
import type { SeguimientoService } from '../../../../application/seguimiento/SeguimientoService.js';
import type { VersionService } from '../../../../application/versiones/VersionService.js';
import type { ITicketQueries } from '../../../../core/ports/repositories/ITicketQueries.js';
import { estadoActualizacion } from '../../../../core/entities/value-objects/version.js';
import { camposDeError } from '../../support/errores.js';

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
  ) {}

  listar = async (req: Request, res: Response): Promise<void> => {
    const texto = str(req.query.q);
    const incluirArchivadas = req.query.archivadas === '1';
    const soloPendientes = req.query.pendientes === '1';
    const soloFavoritas = req.query.favoritas === '1';
    const sistema = str(req.query.sistema);
    const [empresas, versiones, filtrosGuardados] = await Promise.all([
      this.empresas.listar({
        ...(texto ? { texto } : {}),
        ...(incluirArchivadas ? {} : { activa: true }),
        ...(soloFavoritas ? { favorita: true } : {}),
        ...(sistema ? { sistema } : {}),
      }),
      this.versiones.listar(),
      this.filtrosGuardados.listar(req.user!, 'empresas'),
    ]);
    const oficial = this.mapaOficial(versiones);
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
        vencidas: riesgo.filter((l) => l.estado === 'vencida').length,
        porVencer: riesgo.filter((l) => l.estado === 'por_vencer').length,
        desactualizadas: empresa.sistemasContratados.filter(
          (s) => estadoActualizacion(empresa.versionesInstaladas[s], oficial[s]) === 'desactualizada',
        ).length,
      };
    });
    if (soloPendientes) {
      filas = filas.filter((f) => f.vencidas || f.porVencer || f.desactualizadas);
    }
    res.render('pages/backoffice/empresas/list', {
      titulo: 'Empresas',
      filas,
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
    const volver = str(req.body?.volver);
    res.redirect(volver.startsWith('/app/') ? volver : `/app/empresas/${id}`);
  };

  avisarPost = async (req: Request, res: Response): Promise<void> => {
    const tipo = req.body?.tipo === 'licencias' ? 'licencias' : 'versiones';
    const empresaIds = ([] as string[]).concat(req.body?.empresaIds ?? []).filter(Boolean);
    const resultados = empresaIds.length
      ? await this.avisar.ejecutar({ actor: req.user!, empresaIds, tipo })
      : [];
    res.render('pages/backoffice/empresas/avisar-resultado', {
      titulo: 'Resultado del aviso',
      tipo,
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
    const [contactos, tickets, interacciones, versiones] = await Promise.all([
      this.contactos.listar({ empresaId: id }),
      this.ticketQueries.listar({ empresaId: id, limite: 20, archivado: false }),
      this.seguimiento.interaccionesDe(id),
      this.versiones.listar(),
    ]);
    const oficial = this.mapaOficial(versiones);
    const hoy = new Date();
    res.render('pages/backoffice/empresas/detail', {
      titulo: empresa.nombre,
      empresa,
      contactos,
      tickets,
      interacciones,
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
    res.redirect('/app/empresas');
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
      notas: str(b.notas),
    };
  }
}
