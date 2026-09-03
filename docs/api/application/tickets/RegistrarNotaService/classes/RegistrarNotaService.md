[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/tickets/RegistrarNotaService](../README.md) / RegistrarNotaService

# Class: RegistrarNotaService

Caso de uso: agregar una nota (pública o interna) a un ticket.

## Constructors

### Constructor

> **new RegistrarNotaService**(`tickets`, `ids`, `clock`, `email`, `logger`): `RegistrarNotaService`

#### Parameters

##### tickets

[`ITicketRepository`](../../../../core/ports/repositories/ITicketRepository/interfaces/ITicketRepository.md)

##### ids

[`IIdGenerator`](../../../../core/ports/services/IIdGenerator/interfaces/IIdGenerator.md)

##### clock

[`IClock`](../../../../core/ports/services/IClock/interfaces/IClock.md)

##### email

[`IEmailSender`](../../../../core/ports/services/IEmailSender/interfaces/IEmailSender.md)

##### logger

[`ILogger`](../../../../core/ports/services/ILogger/interfaces/ILogger.md)

#### Returns

`RegistrarNotaService`

## Methods

### ejecutar()

> **ejecutar**(`input`): `Promise`\<[`NotaTicket`](../../../../core/entities/NotaTicket/interfaces/NotaTicket.md)\>

#### Parameters

##### input

[`RegistrarNotaInput`](../../dto/interfaces/RegistrarNotaInput.md)

#### Returns

`Promise`\<[`NotaTicket`](../../../../core/entities/NotaTicket/interfaces/NotaTicket.md)\>
