[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/tickets/efectos](../README.md) / publicarNotaInterna

# Function: publicarNotaInterna()

> **publicarNotaInterna**(`webhooks`, `ticket`, `nota`, `por`): `Promise`\<`void`\>

Aviso «nota interna agregada» (n8n/WhatsApp del equipo), como `ticket_nota_interna` del viejo.

## Parameters

### webhooks

[`IWebhookPublisher`](../../../../core/ports/services/IWebhookPublisher/interfaces/IWebhookPublisher.md) \| `undefined`

### ticket

`Pick`\<[`Ticket`](../../../../core/entities/Ticket/classes/Ticket.md), `"id"` \| `"numero"` \| `"asunto"` \| `"empresaNombre"`\>

### nota

`string`

### por

`string`

## Returns

`Promise`\<`void`\>
