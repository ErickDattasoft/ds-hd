[**ds-hd**](../../../../../README.md)

***

[ds-hd](../../../../../README.md) / [core/ports/services/IIntegracionesGateway](../README.md) / IIntegracionesGateway

# Interface: IIntegracionesGateway

Llamadas HTTP salientes hacia n8n (webhook) y CallMeBot (WhatsApp). Separado de
`IWebhookPublisher` porque este puerto devuelve el resultado (para "probar conexión"
desde la UI), mientras que `IWebhookPublisher` es best-effort y no propaga nada.

## Methods

### postWebhook()

> **postWebhook**(`url`, `payload`): `Promise`\<[`ResultadoPrueba`](ResultadoPrueba.md)\>

#### Parameters

##### url

`string`

##### payload

`Record`\<`string`, `unknown`\>

#### Returns

`Promise`\<[`ResultadoPrueba`](ResultadoPrueba.md)\>

***

### enviarWhatsApp()

> **enviarWhatsApp**(`telefono`, `apiKey`, `mensaje`): `Promise`\<[`ResultadoPrueba`](ResultadoPrueba.md)\>

#### Parameters

##### telefono

`string`

##### apiKey

`string`

##### mensaje

`string`

#### Returns

`Promise`\<[`ResultadoPrueba`](ResultadoPrueba.md)\>
