import type { ITicketRepository } from '../../core/ports/repositories/ITicketRepository.js';
import type { IConfiguracionRepository } from '../../core/ports/repositories/IConfiguracionRepository.js';
import type { IBuzonEntrante, CorreoRecibido } from '../../core/ports/services/IBuzonEntrante.js';
import type { IClock } from '../../core/ports/services/IClock.js';
import type { IIdGenerator } from '../../core/ports/services/IIdGenerator.js';
import type { ILogger } from '../../core/ports/services/ILogger.js';
import {
  cuerpoSinCita,
  numeroTicketDeAsunto,
  type ConfiguracionCorreoEntrante,
} from '../../core/entities/ConfiguracionCorreoEntrante.js';
import { ForbiddenError } from '../../core/errors/DomainError.js';
import { registrarEvento } from './efectos.js';
import type { SessionUser } from '../shared/SessionUser.js';

/** Qué se hizo con cada correo revisado. */
export interface ResultadoCorreoEntrante {
  revisados: number;
  agregados: number;
  /** Correos que no se pudieron ligar a un ticket, con el motivo. */
  omitidos: { asunto: string; de: string; motivo: string }[];
}

const LIMITE = 25;

/**
 * Convierte las respuestas que llegan al buzón de soporte en notas del ticket correspondiente.
 *
 * Reglas: el asunto debe traer el número de ticket (los correos del CRM ya lo llevan) y, si está
 * activado `soloContactoDelTicket`, el remitente debe ser el contacto del ticket o alguno de sus
 * CC — así un tercero no puede escribir en un ticket ajeno solo con adivinar el número.
 */
export class CorreoEntranteService {
  constructor(
    private readonly tickets: ITicketRepository,
    private readonly config: IConfiguracionRepository,
    private readonly buzon: IBuzonEntrante,
    private readonly ids: IIdGenerator,
    private readonly clock: IClock,
    private readonly logger: ILogger,
  ) {}

  /** Revisa el buzón. `forzado` = lo pidió una persona desde Configuración (ignora "habilitado"). */
  async revisar(opts: { forzado?: boolean } = {}): Promise<ResultadoCorreoEntrante> {
    const cfg = await this.config.obtenerCorreoEntrante();
    const resultado: ResultadoCorreoEntrante = { revisados: 0, agregados: 0, omitidos: [] };
    if (!cfg.habilitado && !opts.forzado) return resultado;

    const correos = await this.buzon.listarNoLeidos(cfg, LIMITE);
    for (const correo of correos) {
      resultado.revisados++;
      const motivo = await this.procesar(correo, cfg.soloContactoDelTicket);
      if (motivo) {
        resultado.omitidos.push({ asunto: correo.asunto, de: correo.de, motivo });
        // No se marca como leído: queda en el buzón para atenderlo a mano.
        continue;
      }
      resultado.agregados++;
      try {
        await this.buzon.marcarLeido(cfg, correo);
      } catch (err) {
        this.logger.warn('No se pudo marcar el correo como leído', { id: correo.id, err: String(err) });
      }
    }

    const ahora = this.clock.now();
    await this.config.guardarCorreoEntrante({
      ...cfg,
      ultimaRevision: ahora.toISOString(),
      ultimoResultado: `${resultado.agregados} de ${resultado.revisados} agregados${
        resultado.omitidos.length ? `, ${resultado.omitidos.length} sin ligar` : ''
      }`,
    });
    if (resultado.revisados) this.logger.info('Correo entrante revisado', { ...resultado, omitidos: resultado.omitidos.length });
    return resultado;
  }

  /** `null` si quedó agregado al ticket; si no, el motivo por el que se omitió. */
  private async procesar(correo: CorreoRecibido, soloContacto: boolean): Promise<string | null> {
    const numero = numeroTicketDeAsunto(correo.asunto);
    if (!numero) return 'el asunto no trae número de ticket';
    const ticket = await this.tickets.findByNumero(numero);
    if (!ticket) return `no existe el ticket #${numero}`;
    if (soloContacto) {
      const permitidos = [ticket.contactoCorreo ?? '', ...ticket.cc, ...ticket.cco]
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);
      if (!permitidos.includes(correo.de)) return `${correo.de} no es el contacto del ticket #${numero}`;
    }
    const cuerpo = cuerpoSinCita(correo.cuerpo);
    if (!cuerpo) return 'el correo llegó vacío';

    const nombre = `${correo.de} (por correo)`;
    await this.tickets.agregarNota(ticket.id, {
      id: this.ids.newId(),
      tipo: 'publica',
      cuerpo,
      // Autor sintético: la nota la escribió el cliente por correo, no un usuario del CRM.
      autorUid: 'correo-entrante',
      autorNombre: nombre,
      createdAt: correo.recibidoEn,
    });
    await registrarEvento(this.tickets, this.ids, ticket.id, {
      tipo: 'correo',
      resumen: `Respuesta del cliente por correo (${correo.de})`,
      actor: null,
      at: this.clock.now(),
    });
    return null;
  }

  private permiso(actor: SessionUser): void {
    if (!actor.permisos.includes('configuracion:integraciones')) {
      throw new ForbiddenError('No puedes configurar el correo entrante');
    }
  }

  /** Config actual (para la pantalla de Configuración). */
  async configuracion(actor: SessionUser): Promise<ConfiguracionCorreoEntrante> {
    this.permiso(actor);
    return this.config.obtenerCorreoEntrante();
  }

  /** Guarda la config; los secretos vacíos conservan el valor anterior. */
  async guardar(
    actor: SessionUser,
    datos: Omit<ConfiguracionCorreoEntrante, 'ultimaRevision' | 'ultimoResultado'>,
  ): Promise<void> {
    this.permiso(actor);
    const previa = await this.config.obtenerCorreoEntrante();
    await this.config.guardarCorreoEntrante({
      ...previa,
      ...datos,
      clientSecret: datos.clientSecret.trim() || previa.clientSecret,
      refreshToken: datos.refreshToken.trim() || previa.refreshToken,
      region: datos.region.trim() || 'com',
    });
  }

  /** Revisión pedida a mano desde Configuración (aunque esté deshabilitado el automático). */
  async revisarManual(actor: SessionUser): Promise<ResultadoCorreoEntrante> {
    this.permiso(actor);
    return this.revisar({ forzado: true });
  }

  /** Prueba las credenciales y guarda el `accountId` que devuelve Zoho. */
  async verificar(actor: SessionUser): Promise<{ accountId: string; correo: string }> {
    this.permiso(actor);
    const cfg = await this.config.obtenerCorreoEntrante();
    const datos = await this.buzon.verificar(cfg);
    if (datos.accountId !== cfg.accountId) {
      await this.config.guardarCorreoEntrante({ ...cfg, accountId: datos.accountId });
    }
    return datos;
  }
}
