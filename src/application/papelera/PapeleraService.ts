import type { EmpresaService } from '../empresas/EmpresaService.js';
import type { ContactoService } from '../contactos/ContactoService.js';
import type { ArchivarTicketService } from '../tickets/ArchivarTicketService.js';
import type { IEmpresaRepository } from '../../core/ports/repositories/IEmpresaRepository.js';
import type { IContactoRepository } from '../../core/ports/repositories/IContactoRepository.js';
import type { ITicketRepository } from '../../core/ports/repositories/ITicketRepository.js';
import type { ITicketQueries } from '../../core/ports/repositories/ITicketQueries.js';
import type { BitacoraService } from '../shared/BitacoraService.js';
import type { ILogger } from '../../core/ports/services/ILogger.js';
import { ForbiddenError } from '../../core/errors/DomainError.js';
import type { SessionUser } from '../shared/SessionUser.js';

/** Entidades que pueden estar en la papelera. */
export type TipoPapelera = 'empresas' | 'contactos' | 'tickets';

const TIPOS: readonly TipoPapelera[] = ['empresas', 'contactos', 'tickets'];

/** Resultado de una operación por lotes sobre la papelera. */
export interface ResultadoLote {
  ok: number;
  errores: number;
}

/**
 * Acciones masivas sobre la papelera: restaurar varios, eliminar definitivamente y vaciar.
 * El borrado permanente exige `papelera:gestionar`; restaurar delega en cada servicio de
 * módulo (que ya valida `<modulo>:eliminar` y registra en bitácora).
 */
export class PapeleraService {
  constructor(
    private readonly empresasSvc: EmpresaService,
    private readonly contactosSvc: ContactoService,
    private readonly archivarTicket: ArchivarTicketService,
    private readonly empresaRepo: IEmpresaRepository,
    private readonly contactoRepo: IContactoRepository,
    private readonly ticketRepo: ITicketRepository,
    private readonly ticketQueries: ITicketQueries,
    private readonly bitacora: BitacoraService,
    private readonly logger: ILogger,
  ) {}

  static esTipo(v: unknown): v is TipoPapelera {
    return typeof v === 'string' && (TIPOS as readonly string[]).includes(v);
  }

  /** Restaura (saca de la papelera) los elementos indicados. */
  async restaurar(actor: SessionUser, tipo: TipoPapelera, ids: string[]): Promise<ResultadoLote> {
    return this.porCada(ids, (id) => {
      if (tipo === 'empresas') return this.empresasSvc.archivar(actor, id, false);
      if (tipo === 'contactos') return this.contactosSvc.archivar(actor, id, false);
      return this.archivarTicket.ejecutar({ actor, ticketId: id, archivar: false });
    });
  }

  /** Borra definitivamente los elementos indicados (deben estar archivados). */
  async eliminar(actor: SessionUser, tipo: TipoPapelera, ids: string[]): Promise<ResultadoLote> {
    this.exigirGestion(actor);
    const res = await this.porCada(ids, (id) => this.eliminarUno(tipo, id));
    if (res.ok) {
      await this.bitacora.registrar({
        actor,
        accion: 'eliminar_definitivo',
        modulo: 'papelera',
        entidadTipo: tipo,
        entidadId: ids.slice(0, 5).join(',') || '-',
        resumen: `Borrado definitivo de ${res.ok} ${tipo} desde la papelera`,
      });
    }
    return res;
  }

  /** Vacía la papelera de un tipo: borra definitivamente todo lo archivado. */
  async vaciar(actor: SessionUser, tipo: TipoPapelera): Promise<ResultadoLote> {
    this.exigirGestion(actor);
    const ids = await this.idsArchivados(tipo);
    const res = await this.porCada(ids, (id) => this.eliminarUno(tipo, id));
    await this.bitacora.registrar({
      actor,
      accion: 'vaciar',
      modulo: 'papelera',
      entidadTipo: tipo,
      entidadId: '-',
      resumen: `Papelera de ${tipo} vaciada: ${res.ok} elementos borrados`,
    });
    return res;
  }

  private exigirGestion(actor: SessionUser): void {
    if (!actor.permisos.includes('papelera:gestionar')) {
      throw new ForbiddenError('No puedes vaciar la papelera');
    }
  }

  private async eliminarUno(tipo: TipoPapelera, id: string): Promise<void> {
    if (tipo === 'empresas') {
      const e = await this.empresaRepo.findById(id);
      if (e && !e.activa) await this.empresaRepo.eliminar(id);
      return;
    }
    if (tipo === 'contactos') {
      const c = await this.contactoRepo.findById(id);
      if (c && !c.activo) await this.contactoRepo.eliminar(id);
      return;
    }
    const t = await this.ticketRepo.findById(id);
    if (t && t.archivado) await this.ticketRepo.eliminar(id);
  }

  private async idsArchivados(tipo: TipoPapelera): Promise<string[]> {
    if (tipo === 'empresas') return (await this.empresaRepo.list({ activa: false })).map((e) => e.id);
    if (tipo === 'contactos')
      return (await this.contactoRepo.list({ activo: false })).map((c) => c.id);
    return (await this.ticketQueries.listar({ archivado: true })).map((t) => t.id);
  }

  private async porCada(ids: string[], fn: (id: string) => Promise<unknown>): Promise<ResultadoLote> {
    let ok = 0;
    let errores = 0;
    for (const id of ids) {
      try {
        await fn(id);
        ok += 1;
      } catch (err) {
        errores += 1;
        this.logger.warn('Papelera: fallo en operación por lote', {
          id,
          err: err instanceof Error ? err.message : err,
        });
      }
    }
    return { ok, errores };
  }
}
