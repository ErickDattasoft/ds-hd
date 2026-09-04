[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/tickets/ArchivarTicketService](../README.md) / ArchivarTicketService

# Class: ArchivarTicketService

Caso de uso: mandar un ticket a la papelera o restaurarlo.

## Constructors

### Constructor

> **new ArchivarTicketService**(`tickets`, `ids`, `clock`): `ArchivarTicketService`

#### Parameters

##### tickets

[`ITicketRepository`](../../../../core/ports/repositories/ITicketRepository/interfaces/ITicketRepository.md)

##### ids

[`IIdGenerator`](../../../../core/ports/services/IIdGenerator/interfaces/IIdGenerator.md)

##### clock

[`IClock`](../../../../core/ports/services/IClock/interfaces/IClock.md)

#### Returns

`ArchivarTicketService`

## Methods

### ejecutar()

> **ejecutar**(`input`): `Promise`\<`void`\>

#### Parameters

##### input

###### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

###### ticketId

`string`

###### archivar

`boolean`

#### Returns

`Promise`\<`void`\>
