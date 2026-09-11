import type { IConfiguracionRepository } from '../../core/ports/repositories/IConfiguracionRepository.js';
import type { IIntegracionesGateway, ResultadoPrueba } from '../../core/ports/services/IIntegracionesGateway.js';
import type { IEmailSender } from '../../core/ports/services/IEmailSender.js';
import type { ILogger } from '../../core/ports/services/ILogger.js';
import { Email } from '../../core/entities/value-objects/Email.js';
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
  n8nWebhookEmpresas: string;
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

/** Cómo está configurado el envío de correo en el servidor (para la prueba desde la UI). */
export interface InfoCorreo {
  /** `brevo` = API de Brevo · `smtp` = servidor SMTP · `log` = sin configurar (solo se registra). */
  readonly modo: 'brevo' | 'smtp' | 'log';
  /** Dirección `From` con la que sale el correo. */
  readonly remitente: string;
}

/** Casos de uso: leer/actualizar la config de n8n + WhatsApp (CallMeBot) y probar conexión. */
export class ConfiguracionIntegracionesService {
  constructor(
    private readonly repo: IConfiguracionRepository,
    private readonly gateway: IIntegracionesGateway,
    private readonly email: IEmailSender,
    private readonly correo: InfoCorreo,
    private readonly logger: ILogger,
  ) {}

  /** Estado del envío de correo del servidor, para mostrarlo junto al botón de prueba. */
  infoCorreo(): InfoCorreo {
    return this.correo;
  }

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
    if (!urlValida(input.n8nWebhookEmpresas)) {
      throw new ValidationError('URL de webhook de empresas no válida', {
        n8nWebhookEmpresas: 'No es una URL http(s) válida',
      });
    }

    const config: ConfiguracionIntegraciones = {
      n8nWebhookTickets: input.n8nWebhookTickets.trim(),
      n8nWebhookCotizaciones: input.n8nWebhookCotizaciones.trim(),
      n8nWebhookEmpresas: input.n8nWebhookEmpresas.trim(),
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

  /** Manda un correo de prueba a `destino` para verificar que el envío funciona de verdad. */
  async probarCorreo(actor: SessionUser, destino: string): Promise<ResultadoPrueba> {
    if (!actor.permisos.includes('configuracion:integraciones')) {
      throw new ForbiddenError('No puedes probar integraciones');
    }
    const email = Email.tryCreate(destino);
    if (!email) return { ok: false, detalle: 'Escribe un correo de destino válido' };

    if (this.correo.modo === 'log') {
      return {
        ok: false,
        detalle:
          'El servidor no tiene BREVO_API_KEY ni SMTP: los correos solo se registran en el log, no se envían.',
      };
    }

    try {
      await this.email.enviar({
        para: [{ email: email.value }],
        asunto: '✅ Prueba de correo — ds-hd',
        html: `<div style="font-family:sans-serif;padding:16px">
                 <h2 style="margin:0 0 8px">ds-hd</h2>
                 <p>Correo de prueba enviado desde <strong>Configuración → Integraciones</strong>.</p>
                 <p style="color:#64748b;font-size:.9em">Si lo recibes, el envío de correos funciona.</p>
               </div>`,
        tags: ['prueba-correo'],
      });
      this.logger.info('Correo de prueba enviado', { por: actor.uid, destino: email.value });
      return {
        ok: true,
        detalle: `Enviado a ${email.value} desde ${this.correo.remitente} (vía ${this.correo.modo}). Revisa la bandeja y la carpeta de spam.`,
      };
    } catch (err) {
      return { ok: false, detalle: err instanceof Error ? err.message : 'No se pudo enviar el correo' };
    }
  }
}
