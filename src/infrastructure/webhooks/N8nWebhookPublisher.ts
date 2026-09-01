import type { EventoWebhook, IWebhookPublisher } from '../../core/ports/services/IWebhookPublisher.js';
import type { ILogger } from '../../core/ports/services/ILogger.js';

/** Publica eventos a webhooks de n8n. Best-effort: un fallo se registra, no se propaga. */
export class N8nWebhookPublisher implements IWebhookPublisher {
  constructor(
    private readonly urls: { tickets: string; cotizaciones: string },
    private readonly logger: ILogger,
  ) {}

  async publicar(evento: EventoWebhook): Promise<void> {
    const url = this.urls[evento.canal];
    if (!url) {
      this.logger.debug('Webhook sin URL configurada, omitido', { canal: evento.canal, evento: evento.evento });
      return;
    }
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ evento: evento.evento, ...evento.payload, _ts: Date.now() }),
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) {
        this.logger.warn('Webhook n8n respondió con error', { evento: evento.evento, status: res.status });
      }
    } catch (err) {
      this.logger.warn('Webhook n8n falló', {
        evento: evento.evento,
        err: err instanceof Error ? err.message : err,
      });
    }
  }
}

/** No-op para cuando no hay webhooks configurados (dev/tests). */
export class NullWebhookPublisher implements IWebhookPublisher {
  async publicar(): Promise<void> {
    /* nada */
  }
}
