[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/tickets/GestionTicketPublicoService](../README.md) / GestionTicketPublicoService

# Class: GestionTicketPublicoService

Casos de uso: aceptar o rechazar un ticket del buzón público.

## Constructors

### Constructor

> **new GestionTicketPublicoService**(`buzon`, `crearTicket`, `logger`, `adjuntos?`, `ids?`, `clock?`): `GestionTicketPublicoService`

#### Parameters

##### buzon

[`ITicketPublicoRepository`](../../../../core/ports/repositories/ITicketPublicoRepository/interfaces/ITicketPublicoRepository.md)

##### crearTicket

[`CrearTicketService`](../../CrearTicketService/classes/CrearTicketService.md)

##### logger

[`ILogger`](../../../../core/ports/services/ILogger/interfaces/ILogger.md)

##### adjuntos?

[`IAdjuntoTicketRepository`](../../../../core/ports/repositories/IAdjuntoTicketRepository/interfaces/IAdjuntoTicketRepository.md)

##### ids?

[`IIdGenerator`](../../../../core/ports/services/IIdGenerator/interfaces/IIdGenerator.md)

##### clock?

[`IClock`](../../../../core/ports/services/IClock/interfaces/IClock.md)

#### Returns

`GestionTicketPublicoService`

## Methods

### aceptar()

> **aceptar**(`input`): `Promise`\<[`Ticket`](../../../../core/entities/Ticket/classes/Ticket.md)\>

#### Parameters

##### input

###### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

###### id

`string`

#### Returns

`Promise`\<[`Ticket`](../../../../core/entities/Ticket/classes/Ticket.md)\>

***

### rechazar()

> **rechazar**(`input`): `Promise`\<`void`\>

#### Parameters

##### input

###### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

###### id

`string`

#### Returns

`Promise`\<`void`\>
