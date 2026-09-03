[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/portal/ResponderMiTicketService](../README.md) / ResponderMiTicketService

# Class: ResponderMiTicketService

Caso de uso: el cliente responde en su propio ticket (siempre nota pública).

## Constructors

### Constructor

> **new ResponderMiTicketService**(`tickets`, `usuarios`, `ids`, `clock`, `email`, `logger`): `ResponderMiTicketService`

#### Parameters

##### tickets

[`ITicketRepository`](../../../../core/ports/repositories/ITicketRepository/interfaces/ITicketRepository.md)

##### usuarios

[`IUsuarioRepository`](../../../../core/ports/repositories/IUsuarioRepository/interfaces/IUsuarioRepository.md)

##### ids

[`IIdGenerator`](../../../../core/ports/services/IIdGenerator/interfaces/IIdGenerator.md)

##### clock

[`IClock`](../../../../core/ports/services/IClock/interfaces/IClock.md)

##### email

[`IEmailSender`](../../../../core/ports/services/IEmailSender/interfaces/IEmailSender.md)

##### logger

[`ILogger`](../../../../core/ports/services/ILogger/interfaces/ILogger.md)

#### Returns

`ResponderMiTicketService`

## Methods

### ejecutar()

> **ejecutar**(`input`): `Promise`\<[`NotaTicket`](../../../../core/entities/NotaTicket/interfaces/NotaTicket.md)\>

#### Parameters

##### input

###### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

###### ticketId

`string`

###### cuerpo

`string`

#### Returns

`Promise`\<[`NotaTicket`](../../../../core/entities/NotaTicket/interfaces/NotaTicket.md)\>
