[**ds-hd**](../../../../../README.md)

***

[ds-hd](../../../../../README.md) / [core/ports/services/IWebhookPublisher](../README.md) / IWebhookPublisher

# Interface: IWebhookPublisher

Publica eventos salientes hacia automatizaciones externas (n8n). Best-effort:
un fallo se registra pero no rompe el caso de uso.

## Methods

### publicar()

> **publicar**(`evento`): `Promise`\<`void`\>

#### Parameters

##### evento

[`EventoWebhook`](EventoWebhook.md)

#### Returns

`Promise`\<`void`\>
