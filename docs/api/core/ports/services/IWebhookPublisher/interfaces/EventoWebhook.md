[**ds-hd**](../../../../../README.md)

***

[ds-hd](../../../../../README.md) / [core/ports/services/IWebhookPublisher](../README.md) / EventoWebhook

# Interface: EventoWebhook

Defined in: core/ports/services/IWebhookPublisher.ts:2

Eventos de dominio que se publican a sistemas externos (n8n).

## Properties

### evento

> **evento**: `string`

Defined in: core/ports/services/IWebhookPublisher.ts:3

***

### canal

> **canal**: `"tickets"` \| `"cotizaciones"`

Defined in: core/ports/services/IWebhookPublisher.ts:5

Canal lógico (`tickets`, `cotizaciones`…) que decide a qué webhook va.

***

### payload

> **payload**: `Record`\<`string`, `unknown`\>

Defined in: core/ports/services/IWebhookPublisher.ts:6
