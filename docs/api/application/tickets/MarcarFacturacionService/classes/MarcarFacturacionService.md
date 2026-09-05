[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/tickets/MarcarFacturacionService](../README.md) / MarcarFacturacionService

# Class: MarcarFacturacionService

Caso de uso: cambiar el estado de facturación de un ticket (catálogo fijo).

## Constructors

### Constructor

> **new MarcarFacturacionService**(`tickets`, `ids`, `clock`, `webhooks`): `MarcarFacturacionService`

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

#### Parameters

##### input

###### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

###### ticketId

`string`

###### estado

`"no_facturado"` \| `"facturado"` \| `"no_aplica"` \| `"factura_mensual"` \| `"consulta_sin_costo"`

#### Returns

`Promise`\<`void`\>
