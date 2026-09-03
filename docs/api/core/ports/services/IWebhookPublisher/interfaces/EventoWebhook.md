[**ds-hd**](../../../../../README.md)

***

[ds-hd](../../../../../README.md) / [core/ports/services/IWebhookPublisher](../README.md) / EventoWebhook

# Interface: EventoWebhook

Eventos de dominio que se publican a sistemas externos (n8n).

## Properties

### evento

> **evento**: `string`

***

### canal

> **canal**: `"tickets"` \| `"cotizaciones"`

Canal lógico (`tickets`, `cotizaciones`…) que decide a qué webhook va.

***

### payload

> **payload**: `Record`\<`string`, `unknown`\>
