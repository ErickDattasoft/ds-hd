[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/tickets/AdjuntoTicketService](../README.md) / SubirAdjuntoInput

# Interface: SubirAdjuntoInput

Datos de subida de un adjunto (el navegador manda el archivo en base64, sin multipart).

## Properties

### actor

> **actor**: [`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

***

### ticketId

> **ticketId**: `string`

***

### nombre

> **nombre**: `string`

***

### contentType

> **contentType**: `string`

***

### base64

> **base64**: `string`

Base64 puro (sin el prefijo `data:`).
