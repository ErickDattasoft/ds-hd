import type { ObtenerMetricasService, Metricas } from './ObtenerMetricasService.js';
import type { IConfiguracionRepository } from '../../core/ports/repositories/IConfiguracionRepository.js';
import type { IEmailSender } from '../../core/ports/services/IEmailSender.js';
import type { IClock } from '../../core/ports/services/IClock.js';
import type { ILogger } from '../../core/ports/services/ILogger.js';
import type { ConfiguracionResumen } from '../../core/entities/ConfiguracionResumen.js';
import { ForbiddenError, ValidationError } from '../../core/errors/DomainError.js';
import type { SessionUser } from '../shared/SessionUser.js';
import type { BitacoraService } from '../shared/BitacoraService.js';

/** Zona horaria de negocio: define "hoy" y la hora de envío del resumen. */
const TZ = 'America/Mexico_City';

/** Actor sintético para generar el resumen con el mismo alcance "sin filtrar" que ve un admin. */
const ACTOR_SISTEMA: SessionUser = {
  uid: 'sistema',
  nombre: 'Sistema (resumen diario)',
  email: 'sistema@dattasoft.mx',
  roles: ['admin'],
  rol: 'admin',
  empresaId: null,
  activo: true,
  esStaff: true,
  esCliente: false,
  esTecnico: false,
  permisos: ['tickets:leer_todos', 'empresas:leer', 'bitacora:leer', 'tickets:crear'],
};

/** Un correo por línea de un textarea, sin vacíos. */
const listaLimpia = (v: unknown): string[] =>
  String(v ?? '')
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

/** Fecha (`YYYY-MM-DD`) y hora (0-23) locales de {@link TZ} para una fecha dada. */
function fechaYHoraLocal(fecha: Date): { fechaISO: string; hora: number } {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  });
  const partes = Object.fromEntries(fmt.formatToParts(fecha).map((p) => [p.type, p.value]));
  return { fechaISO: `${partes.year}-${partes.month}-${partes.day}`, hora: Number(partes.hour) % 24 };
}

/** Escapa un valor para insertarlo en el HTML del correo. */
function esc(s: string): string {
  return s.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]!);
}

/** Filas `<tr>` de una tabla etiqueta/valor, con un guion si viene vacía. */
function filasConteo(items: { etiqueta: string; valor: number }[]): string {
  if (!items.length) return '<tr><td colspan="2">—</td></tr>';
  return items.map((i) => `<tr><td>${esc(i.etiqueta)}</td><td>${i.valor}</td></tr>`).join('');
}

/**
 * Resumen diario de operación por correo — reusa las mismas métricas que ve un admin en el
 * dashboard (`ObtenerMetricasService`), pero empaquetadas para enviarse solas, ya sea a
 * demanda ("Enviar resumen ahora") o una vez al día vía el job de cron.
 */
export class ResumenDiarioService {
  constructor(
    private readonly metricas: ObtenerMetricasService,
    private readonly repo: IConfiguracionRepository,
    private readonly email: IEmailSender,
    private readonly bitacora: BitacoraService,
    private readonly clock: IClock,
    private readonly logger: ILogger,
  ) {}

  obtenerConfig(): Promise<ConfiguracionResumen> {
    return this.repo.obtenerResumen();
  }

  async actualizarConfig(input: {
    actor: SessionUser;
    habilitado: boolean;
    destinatarios: string;
    horaEnvio: unknown;
  }): Promise<void> {
    if (!input.actor.permisos.includes('configuracion:catalogos')) {
      throw new ForbiddenError('No puedes editar la configuración');
    }
    const actual = await this.repo.obtenerResumen();
    const hora = Number(input.horaEnvio);
    const config: ConfiguracionResumen = {
      habilitado: input.habilitado,
      destinatarios: listaLimpia(input.destinatarios),
      horaEnvio: Number.isFinite(hora) && hora >= 0 && hora <= 23 ? hora : actual.horaEnvio,
      ultimoEnvio: actual.ultimoEnvio,
    };
    await this.repo.guardarResumen(config);
    this.logger.info('Configuración del resumen diario actualizada', { por: input.actor.uid });
  }

  /** Botón "Enviar resumen ahora" desde Configuración. */
  async enviarAhora(actor: SessionUser): Promise<{ enviadoA: string[] }> {
    if (!actor.permisos.includes('configuracion:catalogos')) {
      throw new ForbiddenError('No puedes enviar el resumen');
    }
    const config = await this.repo.obtenerResumen();
    if (!config.destinatarios.length) {
      throw new ValidationError('Agrega al menos un destinatario antes de enviar', {
        destinatarios: 'Requerido',
      });
    }
    const enviadoA = await this.enviar(config.destinatarios, actor);
    await this.repo.guardarResumen({ ...config, ultimoEnvio: fechaYHoraLocal(this.clock.now()).fechaISO });
    return { enviadoA };
  }

  /** Job de cron (corre cada hora): envía una sola vez al día, a la hora configurada. */
  async enviarSiCorresponde(): Promise<{ enviado: boolean; motivo?: string; enviadoA?: string[] }> {
    const config = await this.repo.obtenerResumen();
    if (!config.habilitado) return { enviado: false, motivo: 'deshabilitado' };
    if (!config.destinatarios.length) return { enviado: false, motivo: 'sin destinatarios' };
    const { fechaISO, hora } = fechaYHoraLocal(this.clock.now());
    if (config.ultimoEnvio === fechaISO) return { enviado: false, motivo: 'ya se envió hoy' };
    if (hora !== config.horaEnvio) return { enviado: false, motivo: 'fuera de horario' };

    const enviadoA = await this.enviar(config.destinatarios, ACTOR_SISTEMA);
    await this.repo.guardarResumen({ ...config, ultimoEnvio: fechaISO });
    return { enviado: true, enviadoA };
  }

  private async enviar(destinatarios: string[], actor: SessionUser): Promise<string[]> {
    const m = await this.metricas.ejecutar(ACTOR_SISTEMA);
    await this.email.enviar({
      para: destinatarios.map((email) => ({ email })),
      asunto: 'Resumen diario — ds-hd',
      html: this.html(m),
      tags: ['resumen-diario'],
    });
    await this.bitacora.registrar({
      actor,
      accion: 'enviar',
      modulo: 'configuracion',
      entidadTipo: 'ResumenDiario',
      entidadId: 'resumen',
      resumen: `Resumen diario enviado a ${destinatarios.join(', ')}`,
    });
    this.logger.info('Resumen diario enviado', { destinatarios });
    return destinatarios;
  }

  private html(m: Metricas): string {
    const licencias = m.licencias
      ? `<tr><td>Empresas en riesgo</td><td>${m.licencias.empresasEnRiesgo}</td></tr>
         <tr><td>Licencias vencidas</td><td>${m.licencias.vencidas}</td></tr>
         <tr><td>Licencias por vencer</td><td>${m.licencias.porVencer}</td></tr>
         <tr><td>Avisos pendientes</td><td>${m.licencias.avisosPendientes}</td></tr>`
      : '<tr><td colspan="2">—</td></tr>';
    const eventos = m.proximosEventos.length
      ? m.proximosEventos
          .map((e) => `<li>${esc(e.titulo)} — ${e.fechaHora.toLocaleString('es-MX', { timeZone: TZ })}</li>`)
          .join('')
      : '<li>—</li>';

    return `
      <h2>Resumen diario — ds-hd</h2>
      <h3>Tickets</h3>
      <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse">
        <tr><td>Abiertos</td><td>${m.tickets.abiertos}</td></tr>
        <tr><td>Vencidos (SLA)</td><td>${m.tickets.vencidos}</td></tr>
        <tr><td>Sin asignar</td><td>${m.tickets.sinAsignar}</td></tr>
        <tr><td>Creados esta semana</td><td>${m.tickets.creadosSemana}</td></tr>
        <tr><td>Del buzón público sin revisar</td><td>${m.ticketsPublicosPendientes}</td></tr>
      </table>
      <h4>Por estado</h4>
      <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse">${filasConteo(m.tickets.porEstado)}</table>
      <h4>Por prioridad</h4>
      <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse">${filasConteo(m.tickets.porPrioridad)}</table>

      <h3>Cotizaciones</h3>
      <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse">
        <tr><td>Abiertas (borrador + enviada)</td><td>${m.cotizaciones.totalAbiertas}</td></tr>
      </table>
      <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse">${filasConteo(m.cotizaciones.porEstado)}</table>

      <h3>Licencias y versiones</h3>
      <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse">${licencias}</table>

      <h3>Próximos eventos</h3>
      <ul>${eventos}</ul>
    `;
  }
}
