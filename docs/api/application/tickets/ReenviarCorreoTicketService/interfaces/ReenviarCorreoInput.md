[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/tickets/ReenviarCorreoTicketService](../README.md) / ReenviarCorreoInput

# Interface: ReenviarCorreoInput

Datos para reenviar el correo de un ticket.

## Properties

### actor

> **actor**: [`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

***

### ticketId

> **ticketId**: `string`

***

### esReenvio?

> `optional` **esReenvio?**: `boolean`

`false` = correo al crear el ticket (casilla "Enviar correo al cliente"), no un reenvío.
