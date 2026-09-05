import type { IConfiguracionRepository } from '../../core/ports/repositories/IConfiguracionRepository.js';
import type { IIntegracionesGateway, ResultadoPrueba } from '../../core/ports/services/IIntegracionesGateway.js';
import type { ILogger } from '../../core/ports/services/ILogger.js';
import {
  EVENTOS_NOTIFICABLES,
  sanearReglas,
  type ConfiguracionIntegraciones,
  type MatrizReglas,
} from '../../core/entities/ConfiguracionIntegraciones.js';
import { ForbiddenError, ValidationError } from '../../core/errors/DomainError.js';
import type { SessionUser } from '../shared/SessionUser.js';

/** Entrada de actualización de la config de integraciones (viene del form). */
export interface DatosIntegraciones {
  actor: SessionUser;
  n8nWebhookTickets: string;
  n8nWebhookCotizaciones: string;
  whatsappHabilitado: boolean;
  whatsappTelefono: string;
  whatsappApiKey: string;
  reglas: unknown;
}

/** Vacío es válido (deshabilita el webhook); si no, debe ser una URL http(s). */
function urlValida(v: string): boolean {
  if (!v) return true;
  try {
    const u = new URL(v);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Casos de uso: leer/actualizar la config de n8n + WhatsApp (CallMeBot) y probar conexión. */
export class ConfiguracionIntegracionesService {
  constructor(
    private readonly repo: IConfiguracionRepository,
    private readonly gateway: IIntegracionesGateway,
    private readonly logger: ILogger,
  ) {}

  obtener(): Promise<ConfiguracionIntegraciones> {
    return this.repo.obtenerIntegraciones();
  }

  async actualizar(input: DatosIntegraciones): Promise<void> {
    if (!input.actor.permisos.includes('configuracion:integraciones')) {
      throw new ForbiddenError('No puedes editar la configuración de integraciones');
    }
    if (!urlValida(input.n8nWebhookTickets)) {
      throw new ValidationError('URL de webhook de tickets no válida', { n8nWebhookTickets: 'No es una URL http(s) válida' });
    }
    if (!urlValida(input.n8nWebhookCotizaciones)) {
      throw new ValidationError('URL de webhook de cotizaciones no válida', {
        n8nWebhookCotizaciones: 'No es una URL http(s) válida',
      });
    }

    const config: ConfiguracionIntegraciones = {
      n8nWebhookTickets: input.n8nWebhookTickets.trim(),
      n8nWebhookCotizaciones: input.n8nWebhookCotizaciones.trim(),
      whatsappHabilitado: input.whatsappHabilitado,
      whatsappTelefono: input.whatsappTelefono.trim(),
      whatsappApiKey: input.whatsappApiKey.trim(),
      reglas: sanearReglas(input.reglas) as MatrizReglas,
    };
    await this.repo.guardarIntegraciones(config);
    this.logger.info('Configuración de integraciones actualizada', { por: input.actor.uid });
  }

  /** Convierte los campos `regla_<evento>_webhook`/`regla_<evento>_whatsapp` del form en una matriz. */
  static reglasDeForm(body: Record<string, unknown>): MatrizReglas {
    const out = {} as MatrizReglas;
    for (const evento of EVENTOS_NOTIFICABLES) {
      out[evento] = {
        webhook: Boolean(body[`regla_${evento}_webhook`]),
        whatsapp: Boolean(body[`regla_${evento}_whatsapp`]),
      };
    }
    return out;
  }

  async probarWebhook(actor: SessionUser, url: string): Promise<ResultadoPrueba> {
    if (!actor.permisos.includes('configuracion:integraciones')) {
      throw new ForbiddenError('No puedes probar integraciones');
    }
    if (!url) return { ok: false, detalle: 'Falta la URL' };
    return this.gateway.postWebhook(url, {
      evento: 'prueba.conexion',
      mensaje: 'Prueba de conexión desde ds-hd',
      _ts: Date.now(),
    });
  }

  async probarWhatsApp(actor: SessionUser, telefono: string, apiKey: string): Promise<ResultadoPrueba> {
    if (!actor.permisos.includes('configuracion:integraciones')) {
      throw new ForbiddenError('No puedes probar integraciones');
    }
    if (!telefono || !apiKey) return { ok: false, detalle: 'Falta teléfono o API key' };
    return this.gateway.enviarWhatsApp(telefono, apiKey, 'Prueba de conexión desde ds-hd 🎉');
  }
}
