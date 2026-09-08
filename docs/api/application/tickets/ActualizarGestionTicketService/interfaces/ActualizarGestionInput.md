[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/tickets/ActualizarGestionTicketService](../README.md) / ActualizarGestionInput

# Interface: ActualizarGestionInput

Datos de gestión interna editables desde el detalle del ticket.

## Properties

### actor

> **actor**: [`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

***

### ticketId

> **ticketId**: `string`

***

### solicitadoPor?

> `optional` **solicitadoPor?**: `string`

***

### canalizadoA?

> `optional` **canalizadoA?**: `string`

***

### notasInternas?

> `optional` **notasInternas?**: `string`

Solo se aplica si el actor puede ver notas internas.
