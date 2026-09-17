[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/tickets/ActualizarEstadoTicketService](../README.md) / ActualizarEstadoTicketService

# Class: ActualizarEstadoTicketService

Caso de uso: cambiar el estado de un ticket, con los efectos colaterales del ciclo de vida
(primera respuesta, correos y webhooks de resuelto/cerrado).

## Constructors

### Constructor

> **new ActualizarEstadoTicketService**(`tickets`, `config`, `usuarios`, `ids`, `clock`, `email`, `webhooks`, `logger`, `encuesta?`): `ActualizarEstadoTicketService`

#### Parameters

##### tickets

[`ITicketRepository`](../../../../core/ports/repositories/ITicketRepository/interfaces/ITicketRepository.md)

##### config

[`IConfiguracionRepository`](../../../../core/ports/repositories/IConfiguracionRepository/interfaces/IConfiguracionRepository.md)

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

##### encuesta?

[`EncuestaSatisfaccionService`](../../EncuestaSatisfaccionService/classes/EncuestaSatisfaccionService.md)

#### Returns

`ActualizarEstadoTicketService`

## Methods

### ejecutar()

> **ejecutar**(`input`): `Promise`\<[`Ticket`](../../../../core/entities/Ticket/classes/Ticket.md)\>

#### Parameters

##### input

[`CambiarEstadoInput`](../../dto/interfaces/CambiarEstadoInput.md)

#### Returns

`Promise`\<[`Ticket`](../../../../core/entities/Ticket/classes/Ticket.md)\>
