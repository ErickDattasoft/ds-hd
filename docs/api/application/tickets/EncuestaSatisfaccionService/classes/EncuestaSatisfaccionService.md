[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/tickets/EncuestaSatisfaccionService](../README.md) / EncuestaSatisfaccionService

# Class: EncuestaSatisfaccionService

Encuesta de satisfacción: ligas firmadas (sin login) que el cliente recibe en el correo de
"resuelto/cerrado" para calificar la atención de 1 a 5 y dejar un comentario.

## Constructors

### Constructor

> **new EncuestaSatisfaccionService**(`tickets`, `ids`, `clock`, `secreto`, `baseUrl`): `EncuestaSatisfaccionService`

#### Parameters

##### tickets

[`ITicketRepository`](../../../../core/ports/repositories/ITicketRepository/interfaces/ITicketRepository.md)

##### ids

[`IIdGenerator`](../../../../core/ports/services/IIdGenerator/interfaces/IIdGenerator.md)

##### clock

[`IClock`](../../../../core/ports/services/IClock/interfaces/IClock.md)

##### secreto

`string`

##### baseUrl

`string`

#### Returns

`EncuestaSatisfaccionService`

## Methods

### url()

> **url**(`ticketId`, `calificacion?`): `string`

URL de la encuesta para una calificación dada.

#### Parameters

##### ticketId

`string`

##### calificacion?

`number`

#### Returns

`string`

***

### bloqueCorreo()

> **bloqueCorreo**(`ticket`): `string`

Bloque HTML con las 5 opciones, para el final del correo al cliente.

#### Parameters

##### ticket

`Pick`\<[`Ticket`](../../../../core/entities/Ticket/classes/Ticket.md), `"id"`\>

#### Returns

`string`

***

### ver()

> **ver**(`ticketId`, `firma`): `Promise`\<[`Ticket`](../../../../core/entities/Ticket/classes/Ticket.md)\>

#### Parameters

##### ticketId

`string`

##### firma

`string`

#### Returns

`Promise`\<[`Ticket`](../../../../core/entities/Ticket/classes/Ticket.md)\>

***

### responder()

> **responder**(`ticketId`, `firma`, `calificacion`, `comentario?`): `Promise`\<[`Ticket`](../../../../core/entities/Ticket/classes/Ticket.md)\>

#### Parameters

##### ticketId

`string`

##### firma

`string`

##### calificacion

`number`

##### comentario?

`string` \| `null`

#### Returns

`Promise`\<[`Ticket`](../../../../core/entities/Ticket/classes/Ticket.md)\>

***

### etiqueta()

> `static` **etiqueta**(`n`): `string`

#### Parameters

##### n

`number`

#### Returns

`string`
