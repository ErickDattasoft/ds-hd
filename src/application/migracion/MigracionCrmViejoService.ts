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

/** Cómo correr la importación. */
export interface OpcionesImportarCrmViejo {
  modo: ModoImportacion;
  /** `true` = simulacro: recorre y valida todo pero no escribe (ni borra) nada. */
  simulacro: boolean;
}

/** Qué se importó (o qué se importaría, en simulacro), para pintarlo en la pantalla. */
export interface ResultadoImportacion {
  modo: ModoImportacion;
  simulacro: boolean;
  empresas: number;
  contactos: number;
  tickets: number;
  versiones: number;
  kb: number;
  bitacora: number;
  usuariosFaltantes: number;
  contactosSinEmpresa: string[];
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
    { modo, simulacro }: OpcionesImportarCrmViejo,
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
    const datos = seccionDatos(raw);

    const lineas: string[] = [];
    const log = (paso: string, msg: string): void => {
      lineas.push(`${paso}: ${msg}`);
    };
    const imp = crearImportadores({ dryRun: simulacro, log });

    log('inicio', simulacro ? 'SIMULACRO — no se escribe nada' : `importación real, modo "${modo}"`);
    const borrado = modo === 'sustituir' ? await this.borrarTodo(simulacro, log) : null;

    // Mismo orden que run-all.ts: usuarios primero (solo reporta), tickets al final (necesita
    // el contador de folios ya calculado contra lo que exista).
    const usuariosFaltantes = await imp.importarUsuarios(this.c, datos);
    const empresas = await imp.importarEmpresas(this.c, datos);
    const contactos = await imp.importarContactos(this.c, datos);
    const versiones = await imp.importarVersiones(this.c, datos);
    const kb = await imp.importarKB(this.c, datos);
    const bitacora = await imp.importarBitacora(this.c, datos);
    await imp.importarConfiguracionTickets(this.c, datos);
    await imp.importarConfiguracionAvisos(this.c, datos);
    await imp.importarAcercaDe(this.c, datos);
    const tickets = await imp.importarTickets(this.c, datos);

    log('fin', simulacro ? 'simulacro terminado, la base quedó intacta' : 'importación terminada');

    return {
      modo,
      simulacro,
      empresas: empresas.ok,
      contactos: contactos.ok,
      tickets: tickets.ok,
      versiones,
      kb,
      bitacora,
      usuariosFaltantes,
      contactosSinEmpresa: contactos.sinEmpresa,
      borrado,
      lineas,
    };
  }

  /**
   * Borrado previo del modo "sustituir". Solo toca lo que el respaldo del CRM viejo puede
   * volver a cargar — cotizaciones y eventos NO se borran (el respaldo viejo nunca trajo esos
   * módulos, así que borrarlos sería una pérdida sin recuperación, que es justo la trampa que
   * advierte `scripts/migrate/reset-and-import.ts`).
   *
   * Usuarios, roles y permisos tampoco se tocan nunca: hay que seguir pudiendo entrar.
   */
  private async borrarTodo(
    simulacro: boolean,
    log: (paso: string, msg: string) => void,
  ): Promise<Record<string, number>> {
    const empresaRepo = this.c.resolve('empresaRepo');
    const contactoRepo = this.c.resolve('contactoRepo');
    const ticketRepo = this.c.resolve('ticketRepo');
    const knowledgeRepo = this.c.resolve('knowledgeRepo');
    const versionRepo = this.c.resolve('versionRepo');
    const bitacoraRepo = this.c.resolve('bitacoraRepo');

    const tickets = [
      ...(await this.c.resolve('ticketQueries').listar({})),
      ...(await this.c.resolve('ticketQueries').listar({ archivado: true })),
    ];
    const contactos = await contactoRepo.list();
    const empresas = await empresaRepo.list();
    const articulos = await knowledgeRepo.list();
    const versiones = await versionRepo.list();
    const bitacora = await bitacoraRepo.listar({});

    const conteo = {
      empresas: empresas.length,
      contactos: contactos.length,
      tickets: tickets.length,
      kb: articulos.length,
      versiones: versiones.length,
      bitacora: bitacora.length,
    };
    log(
      'sustituir',
      `${simulacro ? 'se borrarían' : 'borrando'} ${conteo.empresas} empresas, ${conteo.contactos} contactos, ` +
        `${conteo.tickets} tickets, ${conteo.kb} artículos KB, ${conteo.versiones} versiones, ` +
        `${conteo.bitacora} entradas de bitácora (cotizaciones y eventos NO se tocan)`,
    );
    if (simulacro) return conteo;

    for (const t of tickets) await ticketRepo.eliminar(t.id);
    for (const ct of contactos) await contactoRepo.eliminar(ct.id);
    for (const e of empresas) await empresaRepo.eliminar(e.id);
    for (const a of articulos) await knowledgeRepo.eliminar(a.id);
    for (const v of versiones) await versionRepo.eliminar(v.id);
    let hayMas = true;
    while (hayMas) hayMas = (await bitacoraRepo.purgar(new Date(), 500)).hayMas;

    return conteo;
  }
}
