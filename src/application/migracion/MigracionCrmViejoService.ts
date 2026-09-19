import type { Container } from '../../config/container.js';
import { ForbiddenError, ValidationError } from '../../core/errors/DomainError.js';
import type { SessionUser } from '../shared/SessionUser.js';
import { crearImportadores } from './importadores.js';
import { pareceRespaldoViejo, seccionDatos } from './lib.js';

/** Qué hacer con lo que ya existe en ds-hd y no viene en el archivo. */
export type ModoImportacion =
  /** Upsert: agrega y actualiza por id, no borra nada. El modo seguro y el de por defecto. */
  | 'actualizar'
  /** Borra empresas, contactos, tickets, KB, versiones y bitácora antes de cargar. */
  | 'sustituir';

/**
 * Qué parte del respaldo se trae. El CRM viejo sigue en uso por otras personas, así que casi
 * nunca se quiere el archivo entero: lo normal es traer solo tickets, o solo empresas y
 * contactos, sin tocar lo demás de ds-hd.
 */
export type SeccionImportacion =
  | 'empresas'
  | 'contactos'
  | 'tickets'
  | 'eventos'
  | 'cotizaciones'
  | 'kb'
  | 'versiones'
  | 'bitacora'
  | 'configuracion'
  | 'usuarios';

/** Todas las secciones, en el orden en que se ofrecen en la pantalla. */
export const SECCIONES_IMPORTACION: readonly SeccionImportacion[] = [
  'empresas',
  'contactos',
  'tickets',
  'eventos',
  'cotizaciones',
  'kb',
  'versiones',
  'bitacora',
  'configuracion',
  'usuarios',
];

/** Nombre de cada sección tal como se le dice al usuario (mensajes y bitácora de la corrida). */
export const SECCION_ETIQUETA: Record<SeccionImportacion, string> = {
  empresas: 'Empresas',
  contactos: 'Contactos',
  tickets: 'Tickets (con notas, actividad y papelera)',
  eventos: 'Eventos e invitaciones',
  cotizaciones: 'Cotizaciones',
  kb: 'Base de conocimiento',
  versiones: 'Versiones de sistemas y cartas técnicas',
  bitacora: 'Bitácora',
  configuracion: 'Configuración (tickets, avisos, "Acerca de")',
  usuarios: 'Usuarios (solo reporta cuáles faltan)',
};

/** Cómo correr la importación. */
export interface OpcionesImportarCrmViejo {
  modo: ModoImportacion;
  /** `true` = simulacro: recorre y valida todo pero no escribe (ni borra) nada. */
  simulacro: boolean;
  /** Qué secciones traer. Solo estas se leen, se escriben y — en "sustituir" — se borran. */
  secciones: SeccionImportacion[];
}

/** Qué se importó (o qué se importaría, en simulacro), para pintarlo en la pantalla. */
export interface ResultadoImportacion {
  modo: ModoImportacion;
  simulacro: boolean;
  /** Las secciones que se pidieron, tal cual se ejecutaron. */
  secciones: SeccionImportacion[];
  empresas: number;
  contactos: number;
  tickets: number;
  /** Cuántos tickets traía el archivo (si no coincide con `tickets`, algunos no entraron). */
  ticketsEnArchivo: number;
  eventos: number;
  cotizaciones: number;
  versiones: number;
  kb: number;
  bitacora: number;
  usuariosFaltantes: number;
  contactosSinEmpresa: string[];
  cotizacionesSinEmpresa: string[];
  borrado: Record<string, number> | null;
  /** Bitácora de la corrida, línea por línea, tal como la imprime el script por terminal. */
  lineas: string[];
}

/**
 * Importa un respaldo del CRM viejo (botón "Respaldar" de la app original) desde la UI, con
 * la misma lógica exacta que `scripts/migrate/run-all.ts` — ambos consumen los importadores
 * de `importadores.ts`, así que no hay dos versiones que se puedan desincronizar.
 *
 * Es distinto de `BackupService`: ese restaura el formato propio de ds-hd, este traduce el
 * formato del CRM viejo (`{datos: {clientes, contactos, tickets, ...}}`) al modelo nuevo.
 *
 * Los adjuntos de tickets NO se migran por aquí: viven en el Firestore del CRM viejo y
 * requieren su service account, que solo tiene el script (`importarAdjuntos`).
 */
export class MigracionCrmViejoService {
  constructor(private readonly c: Container) {}

  async importar(
    actor: SessionUser,
    raw: Record<string, unknown>,
    { modo, simulacro, secciones }: OpcionesImportarCrmViejo,
  ): Promise<ResultadoImportacion> {
    if (!actor.permisos.includes('configuracion:integraciones')) {
      throw new ForbiddenError('No puedes importar respaldos del CRM viejo');
    }
    if (!pareceRespaldoViejo(raw)) {
      throw new ValidationError(
        'Este archivo no parece un respaldo del CRM viejo: no trae ninguna de sus secciones ' +
          '(clientes, contactos, tickets…). Si es un backup de ds-hd, usa "Restaurar backup" aquí arriba.',
      );
    }
    const pedidas = SECCIONES_IMPORTACION.filter((s) => secciones.includes(s));
    if (!pedidas.length) {
      throw new ValidationError('Marca al menos una cosa que traer (tickets, empresas, contactos…)');
    }
    const trae = (s: SeccionImportacion): boolean => pedidas.includes(s);
    const datos = seccionDatos(raw);

    const lineas: string[] = [];
    const log = (paso: string, msg: string): void => {
      lineas.push(`${paso}: ${msg}`);
    };
    const imp = crearImportadores({ dryRun: simulacro, log });

    log('inicio', simulacro ? 'SIMULACRO — no se escribe nada' : `importación real, modo "${modo}"`);
    log('inicio', `secciones: ${pedidas.map((s) => SECCION_ETIQUETA[s]).join(', ')}`);
    // Un contacto necesita su empresa, y una cotización también: traerlos sin las empresas
    // contra las que emparejar manda al buzón "Sin empresa (revisar tras migración)" todo lo
    // que ds-hd no tenga ya. Se avisa, no se bloquea: reimportar solo contactos sobre una base
    // que ya tiene las empresas es un caso legítimo y frecuente.
    if ((trae('contactos') || trae('cotizaciones')) && !trae('empresas')) {
      log(
        'aviso',
        'traes contactos/cotizaciones sin empresas: lo que no empareje con una empresa que ya ' +
          'exista en ds-hd quedará en "Sin empresa (revisar tras migración)".',
      );
    }
    const borrado = modo === 'sustituir' ? await this.borrar(pedidas, simulacro, log) : null;

    // Mismo orden que run-all.ts: usuarios primero (solo reporta), tickets al final (necesita
    // el contador de folios ya calculado contra lo que exista).
    const usuariosFaltantes = trae('usuarios') ? await imp.importarUsuarios(this.c, datos) : 0;
    const empresas = trae('empresas') ? await imp.importarEmpresas(this.c, datos) : null;
    const contactos = trae('contactos') ? await imp.importarContactos(this.c, datos) : null;
    const versiones = trae('versiones') ? await imp.importarVersiones(this.c, datos) : 0;
    const kb = trae('kb') ? await imp.importarKB(this.c, datos) : 0;
    const bitacora = trae('bitacora') ? await imp.importarBitacora(this.c, datos) : 0;
    if (trae('configuracion')) {
      await imp.importarConfiguracionTickets(this.c, datos);
      await imp.importarConfiguracionAvisos(this.c, datos);
      await imp.importarAcercaDe(this.c, datos);
    }
    const eventos = trae('eventos') ? await imp.importarEventos(this.c, datos) : null;
    const cotizaciones = trae('cotizaciones') ? await imp.importarCotizaciones(this.c, datos) : null;
    const tickets = trae('tickets') ? await imp.importarTickets(this.c, datos) : null;

    log('fin', simulacro ? 'simulacro terminado, la base quedó intacta' : 'importación terminada');

    return {
      modo,
      simulacro,
      secciones: pedidas,
      empresas: empresas?.ok ?? 0,
      contactos: contactos?.ok ?? 0,
      tickets: tickets?.ok ?? 0,
      ticketsEnArchivo: tickets?.total ?? 0,
      eventos: eventos?.ok ?? 0,
      cotizaciones: cotizaciones?.ok ?? 0,
      versiones,
      kb,
      bitacora,
      usuariosFaltantes,
      contactosSinEmpresa: contactos?.sinEmpresa ?? [],
      cotizacionesSinEmpresa: cotizaciones?.sinEmpresa ?? [],
      borrado,
      lineas,
    };
  }

  /**
   * Borrado previo del modo "sustituir". Solo borra las secciones MARCADAS: sustituir tickets
   * no debe llevarse por delante las empresas, que es justo lo que hace falta cuando el CRM
   * viejo y ds-hd conviven y cada rato se trae una parte.
   *
   * Lo que el respaldo viejo no puede volver a cargar no se borra nunca, aunque se marque:
   * usuarios, roles y permisos (hay que seguir pudiendo entrar) y la configuración (el
   * respaldo solo trae tres bloques de ella; borrar el resto sería pérdida sin vuelta, la
   * misma trampa que advierte `scripts/migrate/reset-and-import.ts`).
   */
  private async borrar(
    secciones: SeccionImportacion[],
    simulacro: boolean,
    log: (paso: string, msg: string) => void,
  ): Promise<Record<string, number>> {
    const trae = (s: SeccionImportacion): boolean => secciones.includes(s);
    const conteo: Record<string, number> = {};
    const noBorrables = secciones.filter((s) => s === 'usuarios' || s === 'configuracion');
    if (noBorrables.length) {
      log(
        'sustituir',
        `${noBorrables.map((s) => SECCION_ETIQUETA[s]).join(' y ')}: no se borra nada antes de cargar ` +
          '(los usuarios no se pueden restituir desde el respaldo viejo y la configuración solo viene a medias); ' +
          'esas secciones se sobrescriben con lo que traiga el archivo.',
      );
    }

    // Los tickets se borran primero: contactos y empresas van después para no dejar, ni un
    // instante, tickets colgando de registros que ya no existen.
    if (trae('tickets')) {
      const ticketQueries = this.c.resolve('ticketQueries');
      const tickets = [
        ...(await ticketQueries.listar({})),
        ...(await ticketQueries.listar({ archivado: true })),
      ];
      conteo.tickets = tickets.length;
      // Agrupado: borrar uno por uno lee las dos subcolecciones y borra hijo por hijo de cada
      // ticket, que en una tabla entera son cientos de peticiones HTTP.
      if (!simulacro) await this.c.resolve('ticketRepo').eliminarVarios(tickets.map((t) => t.id));
    }
    if (trae('cotizaciones')) {
      const repo = this.c.resolve('cotizacionRepo');
      const cotizaciones = await repo.list();
      conteo.cotizaciones = cotizaciones.length;
      if (!simulacro) for (const x of cotizaciones) await repo.delete(x.id);
    }
    if (trae('eventos')) {
      const repo = this.c.resolve('eventoRepo');
      const eventos = await repo.list();
      conteo.eventos = eventos.length;
      if (!simulacro) {
        const inscripciones = this.c.resolve('inscripcionRepo');
        for (const e of eventos) {
          // Las inscripciones cuelgan del evento en una subcolección y no se borran solas:
          // sin esto quedarían huérfanas, ocupando espacio y sin pantalla desde la que verlas.
          await inscripciones.eliminarPorEvento(e.id);
          await repo.eliminar(e.id);
        }
      }
    }
    if (trae('contactos')) {
      const repo = this.c.resolve('contactoRepo');
      const contactos = await repo.list();
      conteo.contactos = contactos.length;
      if (!simulacro) for (const x of contactos) await repo.eliminar(x.id);
    }
    if (trae('empresas')) {
      const repo = this.c.resolve('empresaRepo');
      const empresas = await repo.list();
      conteo.empresas = empresas.length;
      if (!simulacro) for (const e of empresas) await repo.eliminar(e.id);
    }
    if (trae('kb')) {
      const repo = this.c.resolve('knowledgeRepo');
      const articulos = await repo.list();
      conteo.kb = articulos.length;
      if (!simulacro) for (const a of articulos) await repo.eliminar(a.id);
    }
    if (trae('versiones')) {
      const repo = this.c.resolve('versionRepo');
      const versiones = await repo.list();
      conteo.versiones = versiones.length;
      if (!simulacro) for (const v of versiones) await repo.eliminar(v.id);
    }
    if (trae('bitacora')) {
      const repo = this.c.resolve('bitacoraRepo');
      conteo.bitacora = (await repo.listar({})).length;
      if (!simulacro) {
        let hayMas = true;
        while (hayMas) hayMas = (await repo.purgar(new Date(), 500)).hayMas;
      }
    }

    const resumen = Object.entries(conteo)
      .map(([k, n]) => `${n} ${k}`)
      .join(', ');
    log('sustituir', `${simulacro ? 'se borrarían' : 'borrando'} ${resumen || 'nada'} antes de cargar`);
    return conteo;
  }
}
