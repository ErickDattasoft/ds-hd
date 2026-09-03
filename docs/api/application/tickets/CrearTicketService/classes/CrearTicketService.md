[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/tickets/CrearTicketService](../README.md) / CrearTicketService

# Class: CrearTicketService

Caso de uso: crear un ticket (interno, portal o al aceptar uno público).

## Constructors

### Constructor

> **new CrearTicketService**(`tickets`, `contadores`, `config`, `ids`, `clock`, `webhooks`, `logger`): `CrearTicketService`

#### Parameters

##### tickets

[`ITicketRepository`](../../../../core/ports/repositories/ITicketRepository/interfaces/ITicketRepository.md)

##### contadores

[`IContadorRepository`](../../../../core/ports/repositories/IContadorRepository/interfaces/IContadorRepository.md)

##### config

[`IConfiguracionRepository`](../../../../core/ports/repositories/IConfiguracionRepository/interfaces/IConfiguracionRepository.md)

##### ids

[`IIdGenerator`](../../../../core/ports/services/IIdGenerator/interfaces/IIdGenerator.md)

##### clock

[`IClock`](../../../../core/ports/services/IClock/interfaces/IClock.md)

##### webhooks

[`IWebhookPublisher`](../../../../core/ports/services/IWebhookPublisher/interfaces/IWebhookPublisher.md)

##### logger

[`ILogger`](../../../../core/ports/services/ILogger/interfaces/ILogger.md)

#### Returns

`CrearTicketService`

## Methods

### ejecutar()

> **ejecutar**(`input`): `Promise`\<[`Ticket`](../../../../core/entities/Ticket/classes/Ticket.md)\>

#### Parameters

##### input

[`CrearTicketInput`](../../dto/interfaces/CrearTicketInput.md)

#### Returns

`Promise`\<[`Ticket`](../../../../core/entities/Ticket/classes/Ticket.md)\>
