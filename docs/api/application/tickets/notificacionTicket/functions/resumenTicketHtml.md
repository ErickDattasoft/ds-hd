[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/tickets/notificacionTicket](../README.md) / resumenTicketHtml

# Function: resumenTicketHtml()

> **resumenTicketHtml**(`ticket`, `eventos`, `opts?`): `string`

Cuerpo HTML de un correo con el resumen del ticket (para el botón "Reenviar correo"): tabla
de datos + descripción + historial de actividad visible para el cliente. Nunca incluye notas
internas.

## Parameters

### ticket

[`Ticket`](../../../../core/entities/Ticket/classes/Ticket.md)

### eventos

readonly [`EventoTicket`](../../../../core/entities/NotaTicket/interfaces/EventoTicket.md)[]

### opts?

#### reenvio?

`boolean`

#### sinContacto?

`boolean`

## Returns

`string`
