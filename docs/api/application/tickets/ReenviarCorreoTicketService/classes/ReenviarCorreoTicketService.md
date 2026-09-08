[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/tickets/ReenviarCorreoTicketService](../README.md) / ReenviarCorreoTicketService

# Class: ReenviarCorreoTicketService

Caso de uso: reenviar al cliente el correo con el resumen actual del ticket.

## Constructors

### Constructor

> **new ReenviarCorreoTicketService**(`tickets`, `config`, `usuarios`, `ids`, `clock`, `email`, `logger`): `ReenviarCorreoTicketService`

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

##### logger

[`ILogger`](../../../../core/ports/services/ILogger/interfaces/ILogger.md)

#### Returns

`ReenviarCorreoTicketService`

## Methods

### ejecutar()

> **ejecutar**(`input`): `Promise`\<\{ `enviadoA`: `string`[]; \}\>

#### Parameters

##### input

[`ReenviarCorreoInput`](../interfaces/ReenviarCorreoInput.md)

#### Returns

`Promise`\<\{ `enviadoA`: `string`[]; \}\>
