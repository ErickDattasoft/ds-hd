[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [core/entities/TicketPublico](../README.md) / TicketPublico

# Interface: TicketPublico

Ticket entrante creado desde el formulario público (sin cuenta). Va a un buzón aparte
(`tickets_publicos`) que el staff revisa y acepta (crea un ticket real) o rechaza.

## Properties

### id

> **id**: `string`

***

### folio

> **folio**: `string`

***

### nombre

> **nombre**: `string`

***

### empresa

> **empresa**: `string` \| `null`

***

### correo

> **correo**: `string`

***

### telefono

> **telefono**: `string` \| `null`

***

### asunto

> **asunto**: `string`

***

### sistema

> **sistema**: `string` \| `null`

***

### tipo

> **tipo**: `string` \| `null`

***

### prioridad

> **prioridad**: `string`

***

### descripcion

> **descripcion**: `string`

***

### estado

> **estado**: `"pendiente"` \| `"aceptado"` \| `"rechazado"`

***

### ticketNumero

> **ticketNumero**: `number` \| `null`

***

### createdAt

> **createdAt**: `Date`
