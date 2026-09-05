import type { EventoWebhook, IWebhookPublisher } from '../../core/ports/services/IWebhookPublisher.js';
import type { ILogger } from '../../core/ports/services/ILogger.js';
import type { IConfiguracionRepository } from '../../core/ports/repositories/IConfiguracionRepository.js';
import type { IIntegracionesGateway } from '../../core/ports/services/IIntegracionesGateway.js';
import { esEventoNotificable } from '../../core/entities/ConfiguracionIntegraciones.js';

function mensajeWhatsApp(evento: EventoWebhook): string {
  const p = evento.payload;
  switch (evento.evento) {
    case 'ticket.creado':
      return `🎫 Nuevo ticket #${p.numero}: ${p.asunto ?? ''}`;
    case 'ticket.asignado':
      return `🎫 Ticket #${p.numero} asignado a ${p.agenteNombre ?? ''}`;
    case 'ticket.resuelto':
      return `🎫 Ticket #${p.numero} resuelto`;
    case 'ticket.cerrado':
      return `🎫 Ticket #${p.numero} cerrado`;
    case 'ticket.facturado':
      return `🎫 Ticket #${p.numero} marcado como facturado`;
    case 'cotizacion.creada':
      return `📄 Nueva cotización ${p.folio ?? ''}`;
    default:
      return `Evento ${evento.evento}`;
  }
}

/**
 * Publica eventos a n8n (webhook) y/o WhatsApp (CallMeBot), según la config guardada en
 * Firestore (`configuracion/integraciones`) — URL, credenciales y matriz de reglas por
 * evento. Si la URL del webhook no está configurada ahí, cae al env var como respaldo
 * (compatibilidad con despliegues que ya la traían fija). Best-effort: un fallo se
 * registra, no se propaga.
 */
export class N8nWebhookPublisher implements IWebhookPublisher {
  constructor(
    private readonly gateway: IIntegracionesGateway,
    private readonly configRepo: IConfiguracionRepository,
    private readonly envUrls: { tickets: string; cotizaciones: string },
    private readonly logger: ILogger,
  ) {}

  async publicar(evento: EventoWebhook): Promise<void> {
    const config = await this.configRepo.obtenerIntegraciones();
    const regla = esEventoNotificable(evento.evento)
      ? config.reglas[evento.evento]
      : { webhook: true, whatsapp: false };

    if (regla.webhook) {
      const url =
        (evento.canal === 'tickets' ? config.n8nWebhookTickets : config.n8nWebhookCotizaciones) ||
        this.envUrls[evento.canal];
      if (!url) {
        this.logger.debug('Webhook sin URL configurada, omitido', { canal: evento.canal, evento: evento.evento });
      } else {
        const r = await this.gateway.postWebhook(url, { evento: evento.evento, ...evento.payload, _ts: Date.now() });
        if (!r.ok) this.logger.warn('Webhook n8n falló', { evento: evento.evento, detalle: r.detalle });
      }
    }

    if (regla.whatsapp && config.whatsappHabilitado && config.whatsappTelefono && config.whatsappApiKey) {
      const r = await this.gateway.enviarWhatsApp(
        config.whatsappTelefono,
        config.whatsappApiKey,
        mensajeWhatsApp(evento),
      );
      if (!r.ok) this.logger.warn('WhatsApp (CallMeBot) falló', { evento: evento.evento, detalle: r.detalle });
    }
  }
}
