[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/tickets/AdjuntoTicketService](../README.md) / AdjuntoTicketService

# Class: AdjuntoTicketService

Caso de uso: adjuntar / ver / borrar archivos de un ticket (staff y portal).

## Constructors

### Constructor

> **new AdjuntoTicketService**(`tickets`, `adjuntos`, `ids`, `clock`, `logger`): `AdjuntoTicketService`

#### Parameters

##### tickets

[`ITicketRepository`](../../../../core/ports/repositories/ITicketRepository/interfaces/ITicketRepository.md)

##### adjuntos

[`IAdjuntoTicketRepository`](../../../../core/ports/repositories/IAdjuntoTicketRepository/interfaces/IAdjuntoTicketRepository.md)

##### ids

[`IIdGenerator`](../../../../core/ports/services/IIdGenerator/interfaces/IIdGenerator.md)

##### clock

[`IClock`](../../../../core/ports/services/IClock/interfaces/IClock.md)

##### logger

[`ILogger`](../../../../core/ports/services/ILogger/interfaces/ILogger.md)

#### Returns

`AdjuntoTicketService`

## Methods

### subir()

> **subir**(`input`): `Promise`\<[`AdjuntoTicketMeta`](../../../../core/entities/AdjuntoTicket/type-aliases/AdjuntoTicketMeta.md)\>

#### Parameters

##### input

[`SubirAdjuntoInput`](../interfaces/SubirAdjuntoInput.md)

#### Returns

`Promise`\<[`AdjuntoTicketMeta`](../../../../core/entities/AdjuntoTicket/type-aliases/AdjuntoTicketMeta.md)\>

***

### listar()

> **listar**(`actor`, `ticketId`): `Promise`\<[`AdjuntoTicketMeta`](../../../../core/entities/AdjuntoTicket/type-aliases/AdjuntoTicketMeta.md)[]\>

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### ticketId

`string`

#### Returns

`Promise`\<[`AdjuntoTicketMeta`](../../../../core/entities/AdjuntoTicket/type-aliases/AdjuntoTicketMeta.md)[]\>

***

### ver()

> **ver**(`actor`, `ticketId`, `adjuntoId`): `Promise`\<\{ `nombre`: `string`; `contentType`: `string`; `buffer`: `Buffer`; \}\>

Devuelve el contenido de un adjunto para servirlo como descarga / imagen.

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### ticketId

`string`

##### adjuntoId

`string`

#### Returns

`Promise`\<\{ `nombre`: `string`; `contentType`: `string`; `buffer`: `Buffer`; \}\>

***

### eliminar()

> **eliminar**(`actor`, `ticketId`, `adjuntoId`): `Promise`\<`void`\>

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### ticketId

`string`

##### adjuntoId

`string`

#### Returns

`Promise`\<`void`\>
