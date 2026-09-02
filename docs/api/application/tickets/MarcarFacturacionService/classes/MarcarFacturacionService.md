[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/tickets/MarcarFacturacionService](../README.md) / MarcarFacturacionService

# Class: MarcarFacturacionService

Defined in: application/tickets/MarcarFacturacionService.ts:10

Caso de uso: marcar/desmarcar un ticket como facturado.

## Constructors

### Constructor

> **new MarcarFacturacionService**(`tickets`, `ids`, `clock`, `webhooks`): `MarcarFacturacionService`

Defined in: application/tickets/MarcarFacturacionService.ts:11

#### Parameters

##### tickets

[`ITicketRepository`](../../../../core/ports/repositories/ITicketRepository/interfaces/ITicketRepository.md)

##### ids

[`IIdGenerator`](../../../../core/ports/services/IIdGenerator/interfaces/IIdGenerator.md)

##### clock

[`IClock`](../../../../core/ports/services/IClock/interfaces/IClock.md)

##### webhooks

[`IWebhookPublisher`](../../../../core/ports/services/IWebhookPublisher/interfaces/IWebhookPublisher.md)

#### Returns

`MarcarFacturacionService`

## Methods

### ejecutar()

> **ejecutar**(`input`): `Promise`\<`void`\>

Defined in: application/tickets/MarcarFacturacionService.ts:18

#### Parameters

##### input

###### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

###### ticketId

`string`

###### facturado

`boolean`

#### Returns

`Promise`\<`void`\>
