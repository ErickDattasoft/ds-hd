[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/tickets/AsignarAgenteService](../README.md) / AsignarAgenteService

# Class: AsignarAgenteService

Defined in: application/tickets/AsignarAgenteService.ts:15

Caso de uso: asignar un ticket a un agente técnico, respetando su capacidad.

## Constructors

### Constructor

> **new AsignarAgenteService**(`tickets`, `queries`, `usuarios`, `ids`, `clock`, `email`, `webhooks`, `logger`): `AsignarAgenteService`

Defined in: application/tickets/AsignarAgenteService.ts:16

#### Parameters

##### tickets

[`ITicketRepository`](../../../../core/ports/repositories/ITicketRepository/interfaces/ITicketRepository.md)

##### queries

[`ITicketQueries`](../../../../core/ports/repositories/ITicketQueries/interfaces/ITicketQueries.md)

##### usuarios

[`IUsuarioRepository`](../../../../core/ports/repositories/IUsuarioRepository/interfaces/IUsuarioRepository.md)

##### ids

[`IIdGenerator`](../../../../core/ports/services/IIdGenerator/interfaces/IIdGenerator.md)

##### clock

[`IClock`](../../../../core/ports/services/IClock/interfaces/IClock.md)

##### email

[`IEmailSender`](../../../../core/ports/services/IEmailSender/interfaces/IEmailSender.md)

##### webhooks

[`IWebhookPublisher`](../../../../core/ports/services/IWebhookPublisher/interfaces/IWebhookPublisher.md)

##### logger

[`ILogger`](../../../../core/ports/services/ILogger/interfaces/ILogger.md)

#### Returns

`AsignarAgenteService`

## Methods

### ejecutar()

> **ejecutar**(`input`): `Promise`\<[`Ticket`](../../../../core/entities/Ticket/classes/Ticket.md)\>

Defined in: application/tickets/AsignarAgenteService.ts:27

#### Parameters

##### input

[`AsignarAgenteInput`](../../dto/interfaces/AsignarAgenteInput.md)

#### Returns

`Promise`\<[`Ticket`](../../../../core/entities/Ticket/classes/Ticket.md)\>
