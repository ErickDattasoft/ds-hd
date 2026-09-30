import type { EventoWebhook, IWebhookPublisher } from '../../core/ports/services/IWebhookPublisher.js';
import type { ILogger } from '../../core/ports/services/ILogger.js';
import type { IConfiguracionRepository } from '../../core/ports/repositories/IConfiguracionRepository.js';
import type { IIntegracionesGateway } from '../../core/ports/services/IIntegracionesGateway.js';
import {
  equipoWhatsApp,
  esEventoNotificable,
  type ConfiguracionIntegraciones,
} from '../../core/entities/ConfiguracionIntegraciones.js';

/**
 * El recordatorio de ticket programado lleva además, con la misma forma que mandaba el CRM
 * viejo (`ticket` + `destinatarios` con teléfono y API key), a quién del equipo avisar: n8n
 * agenda el WhatsApp 30 min antes y necesita saber a quién. Sin elegidos = todo el equipo.
 */
function extrasRecordatorio(evento: EventoWebhook, config: ConfiguracionIntegraciones): Record<string, unknown> {
  if (evento.evento !== 'ticket.programado') return {};
  const p = evento.payload;
  const elegidos = Array.isArray(p.destinatarioNombres) ? (p.destinatarioNombres as string[]) : [];
  const equipo = equipoWhatsApp(config);
  const destinatarios = elegidos.length ? equipo.filter((d) => elegidos.includes(d.nombre)) : equipo;
  return {
    destinatarios,
    ticket: {
      id: String(p.numero ?? ''),
      numero: p.numero,
      empresa: p.empresaNombre ?? '',
      asunto: p.asunto,
      agenteAsignado: p.agenteAsignadoNombre ?? '',
      fechaProgramada: p.fecha ?? '',
      horaProgramada: p.hora ?? '',
      fechaHoraISO: p.fechaHoraIso ?? '',
    },
  };
}

function mensajeWhatsApp(evento: EventoWebhook): string {
  const p = evento.payload;
  switch (evento.evento) {
    case 'ticket.creado':
      return `🎫 Nuevo ticket #${p.numero}: ${p.asunto ?? ''}`;
    case 'ticket.creado_cliente':
      return `🎫 El cliente${p.empresaNombre ? ` ${p.empresaNombre}` : ''} abrió el ticket #${p.numero}: ${p.asunto ?? ''}`;
    case 'ticket.estado_cambiado':
      return `🔄 Ticket #${p.numero}: ${p.estadoAnterior ?? ''} → ${p.estadoNuevo ?? ''}${p.por ? ` (${p.por})` : ''}`;
    case 'ticket.nota_interna':
      return `📝 Nota interna en ticket #${p.numero}${p.por ? ` de ${p.por}` : ''}: ${String(p.nota ?? '').slice(0, 300)}`;
    case 'ticket.asignado':
      return `🎫 Ticket #${p.numero} asignado a ${p.agenteNombre ?? ''}`;
    case 'ticket.resuelto':
      return `🎫 Ticket #${p.numero} resuelto`;
    case 'ticket.cerrado':
      return `🎫 Ticket #${p.numero} cerrado`;
    case 'ticket.facturado':
      return `🎫 Ticket #${p.numero} marcado como facturado`;
    case 'ticket.programado':
      return `📅 Ticket #${p.numero} programado para ${p.fecha ?? ''} ${p.hora ?? ''}`.trim();
    case 'cotizacion.creada':
      return `📄 Nueva cotización ${p.folio ?? ''}`;
    case 'empresa.creada':
      return `🏢 Nueva empresa: ${p.nombre ?? ''}${p.registradaPor ? ` (registrada por ${p.registradaPor})` : ''}`;
    case 'usuario.creado':
      return `👤 Usuario nuevo en el CRM: ${p.nombre ?? ''} (${p.rol ?? ''})${p.creadoPor ? `, creado por ${p.creadoPor}` : ''}`;
    case 'backup.no_realizado':
      return p.ultimoBackup
        ? `🛡️ Han pasado ${p.diasSinBackup} días desde el último backup del CRM — descárgalo en Configuración → Backup`
        : '🛡️ Nunca se ha descargado un backup del CRM — hazlo en Configuración → Backup';
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
    private readonly envUrls: Partial<Record<EventoWebhook['canal'], string>>,
    private readonly logger: ILogger,
  ) {}

  async publicar(evento: EventoWebhook): Promise<void> {
    const config = await this.configRepo.obtenerIntegraciones();
    const regla = esEventoNotificable(evento.evento)
      ? config.reglas[evento.evento]
      : { webhook: true, whatsapp: false };

    if (regla.webhook) {
      const porCanal = {
        tickets: config.n8nWebhookTickets,
        cotizaciones: config.n8nWebhookCotizaciones,
        empresas: config.n8nWebhookEmpresas,
      };
      const url = porCanal[evento.canal] || this.envUrls[evento.canal];
      if (!url) {
        this.logger.debug('Webhook sin URL configurada, omitido', { canal: evento.canal, evento: evento.evento });
      } else {
        const r = await this.gateway.postWebhook(url, {
          evento: evento.evento,
          ...evento.payload,
          ...extrasRecordatorio(evento, config),
          _ts: Date.now(),
        });
        if (!r.ok) this.logger.warn('Webhook n8n falló', { evento: evento.evento, detalle: r.detalle });
      }
    }

    if (regla.whatsapp && config.whatsappHabilitado) {
      // El número principal + las demás personas del equipo (o solo las elegidas para este evento).
      const elegidos = 'destinatarios' in regla ? regla.destinatarios : undefined;
      const destinos = equipoWhatsApp(config).filter((d) => !elegidos?.length || elegidos.includes(d.nombre));
      const mensaje = mensajeWhatsApp(evento);
      await Promise.all(
        destinos.map(async (d) => {
          const r = await this.gateway.enviarWhatsApp(d.telefono, d.apiKey, mensaje);
          if (!r.ok) {
            this.logger.warn('WhatsApp (CallMeBot) falló', { evento: evento.evento, telefono: d.telefono, detalle: r.detalle });
          }
        }),
      );
    }
  }
}
