import type { IEmpresaRepository } from '../../core/ports/repositories/IEmpresaRepository.js';
import type { IContactoRepository } from '../../core/ports/repositories/IContactoRepository.js';
import type { ITicketRepository } from '../../core/ports/repositories/ITicketRepository.js';
import type { ITicketQueries } from '../../core/ports/repositories/ITicketQueries.js';
import type { ICotizacionRepository } from '../../core/ports/repositories/ICotizacionRepository.js';
import type { IVersionRepository } from '../../core/ports/repositories/IVersionRepository.js';
import type { IKnowledgeRepository } from '../../core/ports/repositories/IKnowledgeRepository.js';
import type { IUsuarioRepository } from '../../core/ports/repositories/IUsuarioRepository.js';
import type { IConfiguracionRepository } from '../../core/ports/repositories/IConfiguracionRepository.js';
import type { IContadorRepository } from '../../core/ports/repositories/IContadorRepository.js';
import type { IClock } from '../../core/ports/services/IClock.js';
import { Empresa, type EmpresaProps } from '../../core/entities/Empresa.js';
import { Contacto, type ContactoProps } from '../../core/entities/Contacto.js';
import { Ticket, type TicketProps } from '../../core/entities/Ticket.js';
import { Cotizacion, type CotizacionProps } from '../../core/entities/Cotizacion.js';
import { VersionSistema, type VersionSistemaProps } from '../../core/entities/VersionSistema.js';
import { ArticuloKB, type ArticuloKBProps } from '../../core/entities/ArticuloKB.js';
import { Usuario, type UsuarioProps } from '../../core/entities/Usuario.js';
import { sanearAcercaDe } from '../../core/entities/AcercaDe.js';
import { sanearConfigCotizaciones } from '../../core/entities/ConfiguracionCotizaciones.js';
import { sanearConfigResumen } from '../../core/entities/ConfiguracionResumen.js';
import { CONTADOR_TICKETS } from '../tickets/constantes.js';
import { ForbiddenError } from '../../core/errors/DomainError.js';
import type { SessionUser } from '../shared/SessionUser.js';

/** Versión del formato de backup — súbela si cambia la forma de alguna sección. */
export const VERSION_BACKUP = 1;

/** Cuántos registros de cada colección se restauraron, y qué falló. */
export interface ResumenRestauracion {
  empresas: number;
  contactos: number;
  tickets: number;
  cotizaciones: number;
  versiones: number;
  kb: number;
  usuarios: number;
  errores: string[];
}

const arr = (v: unknown): Record<string, unknown>[] => (Array.isArray(v) ? (v as Record<string, unknown>[]) : []);

const RE_FECHA_ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

/** Recorre el JSON del backup y convierte cada string con pinta de fecha ISO (como las que
 * produce `Date.toJSON()` al exportar) de vuelta a `Date` — así no hay que listar a mano
 * cada campo de fecha de cada entidad, ni sus estructuras anidadas (sla, facturación...). */
function reviveFechas(v: unknown): unknown {
  if (typeof v === 'string') return RE_FECHA_ISO.test(v) ? new Date(v) : v;
  if (Array.isArray(v)) return v.map(reviveFechas);
  if (v && typeof v === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v)) out[k] = reviveFechas(val);
    return out;
  }
  return v;
}

/**
 * Backup/restauración completa de ds-hd, en el propio formato del sistema (no el del CRM
 * viejo — ese lo maneja `scripts/migrate/`). Pensado para respaldo manual y recuperación
 * ante desastres, no para migrar entre sistemas distintos.
 *
 * Restaurar es SIEMPRE upsert (agrega/actualiza por id) — nunca borra lo que ya existe en
 * ds-hd y no viene en el archivo. Un modo de reemplazo total (borrar lo que sobra) quedó
 * descartado a propósito: es mucho más arriesgado y el usuario pidió explícitamente la
 * opción segura.
 */
export class BackupService {
  constructor(
    private readonly empresas: IEmpresaRepository,
    private readonly contactos: IContactoRepository,
    private readonly ticketRepo: ITicketRepository,
    private readonly ticketQueries: ITicketQueries,
    private readonly cotizaciones: ICotizacionRepository,
    private readonly versiones: IVersionRepository,
    private readonly kb: IKnowledgeRepository,
    private readonly usuarios: IUsuarioRepository,
    private readonly configuracion: IConfiguracionRepository,
    private readonly contador: IContadorRepository,
    private readonly clock: IClock,
  ) {}

  /** Vuelca todas las colecciones principales a un solo objeto serializable a JSON. */
  async exportar(): Promise<Record<string, unknown>> {
    const [
      empresas,
      contactos,
      tickets,
      cotizaciones,
      versiones,
      kb,
      usuarios,
      tickets_cfg,
      calculadora,
      avisos,
      acercaDe,
      cotizaciones_cfg,
      logo,
      resumen,
    ] = await Promise.all([
      this.empresas.list({}),
      this.contactos.list({}),
      this.ticketQueries.listar({}),
      this.cotizaciones.list({}),
      this.versiones.list(),
      this.kb.list({}),
      this.usuarios.list({}),
      this.configuracion.obtenerTickets(),
      this.configuracion.obtenerCalculadora(),
      this.configuracion.obtenerAvisos(),
      this.configuracion.obtenerAcercaDe(),
      this.configuracion.obtenerCotizaciones(),
      this.configuracion.obtenerLogo(),
      this.configuracion.obtenerResumen(),
    ]);

    return {
      version: VERSION_BACKUP,
      generadoEn: this.clock.now().toISOString(),
      empresas,
      contactos,
      tickets,
      cotizaciones,
      versiones,
      kb,
      // Las cuentas se listan sin nada sensible de Auth (no hay contraseñas que respaldar
      // aquí — eso vive en Firebase Auth, fuera de Firestore).
      usuarios: usuarios.map((u) => ({ ...u, email: u.email.value })),
      configuracion: {
        tickets: tickets_cfg,
        calculadora,
        avisos,
        acercaDe,
        cotizaciones: cotizaciones_cfg,
        logo,
        resumen,
      },
    };
  }

  /** Restaura un backup exportado por `exportar()` — upsert por id, nunca borra. */
  async restaurar(actor: SessionUser, datosCrudos: Record<string, unknown>): Promise<ResumenRestauracion> {
    if (!actor.permisos.includes('configuracion:integraciones')) {
      throw new ForbiddenError('No puedes restaurar backups');
    }
    const datos = reviveFechas(datosCrudos) as Record<string, unknown>;

    const resumen: ResumenRestauracion = {
      empresas: 0,
      contactos: 0,
      tickets: 0,
      cotizaciones: 0,
      versiones: 0,
      kb: 0,
      usuarios: 0,
      errores: [],
    };

    for (const d of arr(datos.empresas)) {
      try {
        await this.empresas.save(new Empresa(d as unknown as EmpresaProps));
        resumen.empresas++;
      } catch (err) {
        resumen.errores.push(`empresa "${d.nombre}": ${err instanceof Error ? err.message : err}`);
      }
    }
    for (const d of arr(datos.contactos)) {
      try {
        await this.contactos.save(new Contacto(d as unknown as ContactoProps));
        resumen.contactos++;
      } catch (err) {
        resumen.errores.push(`contacto "${d.nombre}": ${err instanceof Error ? err.message : err}`);
      }
    }
    let maxNumero = 0;
    for (const d of arr(datos.tickets)) {
      try {
        const ticket = new Ticket(d as unknown as TicketProps);
        await this.ticketRepo.save(ticket);
        maxNumero = Math.max(maxNumero, ticket.numero);
        resumen.tickets++;
      } catch (err) {
        resumen.errores.push(`ticket #${d.numero}: ${err instanceof Error ? err.message : err}`);
      }
    }
    if (maxNumero > 0) await this.contador.fijar(CONTADOR_TICKETS, maxNumero);
    for (const d of arr(datos.cotizaciones)) {
      try {
        await this.cotizaciones.save(new Cotizacion(d as unknown as CotizacionProps));
        resumen.cotizaciones++;
      } catch (err) {
        resumen.errores.push(`cotización "${d.folio}": ${err instanceof Error ? err.message : err}`);
      }
    }
    for (const d of arr(datos.versiones)) {
      try {
        await this.versiones.save(new VersionSistema(d as unknown as VersionSistemaProps));
        resumen.versiones++;
      } catch (err) {
        resumen.errores.push(`versión "${d.sistema}": ${err instanceof Error ? err.message : err}`);
      }
    }
    for (const d of arr(datos.kb)) {
      try {
        await this.kb.save(new ArticuloKB(d as unknown as ArticuloKBProps));
        resumen.kb++;
      } catch (err) {
        resumen.errores.push(`artículo "${d.titulo}": ${err instanceof Error ? err.message : err}`);
      }
    }
    for (const d of arr(datos.usuarios)) {
      try {
        await this.usuarios.save(new Usuario(d as unknown as UsuarioProps));
        resumen.usuarios++;
      } catch (err) {
        resumen.errores.push(`usuario "${d.email}": ${err instanceof Error ? err.message : err}`);
      }
    }
    const cfg = (datos.configuracion ?? {}) as Record<string, unknown>;
    if (cfg.tickets) await this.configuracion.guardarTickets(cfg.tickets as never);
    if (cfg.calculadora) await this.configuracion.guardarCalculadora(cfg.calculadora as never);
    if (cfg.avisos) await this.configuracion.guardarAvisos(cfg.avisos as never);
    if (cfg.acercaDe) await this.configuracion.guardarAcercaDe(sanearAcercaDe(cfg.acercaDe));
    if (cfg.cotizaciones) {
      await this.configuracion.guardarCotizaciones(sanearConfigCotizaciones(cfg.cotizaciones));
    }
    if (cfg.logo) await this.configuracion.guardarLogo(cfg.logo as never);
    if (cfg.resumen) await this.configuracion.guardarResumen(sanearConfigResumen(cfg.resumen));

    return resumen;
  }
}
