/** Eventos de dominio que se publican a sistemas externos (n8n). */
export interface EventoWebhook {
  evento: string;
  /** Canal lógico (`tickets`, `cotizaciones`…) que decide a qué webhook va. */
  canal: 'tickets' | 'cotizaciones';
  payload: Record<string, unknown>;
}

/**
 * Publica eventos salientes hacia automatizaciones externas (n8n). Best-effort:
 * un fallo se registra pero no rompe el caso de uso.
 */
export interface IWebhookPublisher {
  publicar(evento: EventoWebhook): Promise<void>;
}
