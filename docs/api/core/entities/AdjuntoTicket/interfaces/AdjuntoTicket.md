[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [core/entities/AdjuntoTicket](../README.md) / AdjuntoTicket

# Interface: AdjuntoTicket

Adjunto de un ticket. El contenido vive como data URL (`data:<tipo>;base64,…`) en su propio
documento `tickets_adjuntos/{id}` — igual que en el CRM viejo, para no inflar el doc del
ticket ni depender de Firebase Storage.

## Properties

### id

> **id**: `string`

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

### tamano

> **tamano**: `number`

Tamaño del archivo original en bytes (antes de base64).

***

### data

> **data**: `string`

`data:<contentType>;base64,<...>`.

***

### subidoPorUid

> **subidoPorUid**: `string` \| `null`

***

### subidoPorNombre

> **subidoPorNombre**: `string` \| `null`

***

### createdAt

> **createdAt**: `Date`
