[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [core/entities/TicketPublico](../README.md) / TicketPublico

# Interface: TicketPublico

Defined in: core/entities/TicketPublico.ts:5

Ticket entrante creado desde el formulario público (sin cuenta). Va a un buzón aparte
(`tickets_publicos`) que el staff revisa y acepta (crea un ticket real) o rechaza.

## Properties

### id

> **id**: `string`

Defined in: core/entities/TicketPublico.ts:6

***

### folio

> **folio**: `string`

Defined in: core/entities/TicketPublico.ts:7

***

### nombre

> **nombre**: `string`

Defined in: core/entities/TicketPublico.ts:8

***

### empresa

> **empresa**: `string` \| `null`

Defined in: core/entities/TicketPublico.ts:9

***

### correo

> **correo**: `string`

Defined in: core/entities/TicketPublico.ts:10

***

### telefono

> **telefono**: `string` \| `null`

Defined in: core/entities/TicketPublico.ts:11

***

### asunto

> **asunto**: `string`

Defined in: core/entities/TicketPublico.ts:12

***

### sistema

> **sistema**: `string` \| `null`

Defined in: core/entities/TicketPublico.ts:13

***

### tipo

> **tipo**: `string` \| `null`

Defined in: core/entities/TicketPublico.ts:14

***

### prioridad

> **prioridad**: `string`

Defined in: core/entities/TicketPublico.ts:15

***

### descripcion

> **descripcion**: `string`

Defined in: core/entities/TicketPublico.ts:16

***

### estado

> **estado**: `"pendiente"` \| `"aceptado"` \| `"rechazado"`

Defined in: core/entities/TicketPublico.ts:17

***

### ticketNumero

> **ticketNumero**: `number` \| `null`

Defined in: core/entities/TicketPublico.ts:18

***

### createdAt

> **createdAt**: `Date`

Defined in: core/entities/TicketPublico.ts:19
