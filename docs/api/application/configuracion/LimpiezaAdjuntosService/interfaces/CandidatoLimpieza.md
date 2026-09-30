[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/configuracion/LimpiezaAdjuntosService](../README.md) / CandidatoLimpieza

# Interface: CandidatoLimpieza

Un adjunto que se puede archivar y eliminar, con los datos de su ticket para nombrarlo.

## Extends

- [`AdjuntoTicketMeta`](../../../../core/entities/AdjuntoTicket/type-aliases/AdjuntoTicketMeta.md)

## Properties

### ticketNumero

> **ticketNumero**: `number`

***

### empresaNombre

> **empresaNombre**: `string`

***

### cerradoEn

> **cerradoEn**: `Date`

***

### nombreArchivo

> **nombreArchivo**: `string`

`ticket_empresa_fecha_nombre`, igual que el CRM viejo.

***

### id

> **id**: `string`

#### Inherited from

[`AdjuntoTicket`](../../../../core/entities/AdjuntoTicket/interfaces/AdjuntoTicket.md).[`id`](../../../../core/entities/AdjuntoTicket/interfaces/AdjuntoTicket.md#id)

***

### ticketId

> **ticketId**: `string`

#### Inherited from

[`AdjuntoTicket`](../../../../core/entities/AdjuntoTicket/interfaces/AdjuntoTicket.md).[`ticketId`](../../../../core/entities/AdjuntoTicket/interfaces/AdjuntoTicket.md#ticketid)

***

### nombre

> **nombre**: `string`

#### Inherited from

[`AdjuntoTicket`](../../../../core/entities/AdjuntoTicket/interfaces/AdjuntoTicket.md).[`nombre`](../../../../core/entities/AdjuntoTicket/interfaces/AdjuntoTicket.md#nombre)

***

### contentType

> **contentType**: `string`

#### Inherited from

[`AdjuntoTicket`](../../../../core/entities/AdjuntoTicket/interfaces/AdjuntoTicket.md).[`contentType`](../../../../core/entities/AdjuntoTicket/interfaces/AdjuntoTicket.md#contenttype)

***

### tamano

> **tamano**: `number`

Tamaño del archivo original en bytes (antes de base64).

#### Inherited from

[`AdjuntoTicket`](../../../../core/entities/AdjuntoTicket/interfaces/AdjuntoTicket.md).[`tamano`](../../../../core/entities/AdjuntoTicket/interfaces/AdjuntoTicket.md#tamano)

***

### subidoPorUid

> **subidoPorUid**: `string` \| `null`

#### Inherited from

[`AdjuntoTicket`](../../../../core/entities/AdjuntoTicket/interfaces/AdjuntoTicket.md).[`subidoPorUid`](../../../../core/entities/AdjuntoTicket/interfaces/AdjuntoTicket.md#subidoporuid)

***

### subidoPorNombre

> **subidoPorNombre**: `string` \| `null`

#### Inherited from

[`AdjuntoTicket`](../../../../core/entities/AdjuntoTicket/interfaces/AdjuntoTicket.md).[`subidoPorNombre`](../../../../core/entities/AdjuntoTicket/interfaces/AdjuntoTicket.md#subidopornombre)

***

### createdAt

> **createdAt**: `Date`

#### Inherited from

[`AdjuntoTicket`](../../../../core/entities/AdjuntoTicket/interfaces/AdjuntoTicket.md).[`createdAt`](../../../../core/entities/AdjuntoTicket/interfaces/AdjuntoTicket.md#createdat)

***

### permanente?

> `optional` **permanente?**: `boolean`

📌 Marcado para conservarlo: no se puede quitar ni lo toca la limpieza de adjuntos.

#### Inherited from

[`AdjuntoTicket`](../../../../core/entities/AdjuntoTicket/interfaces/AdjuntoTicket.md).[`permanente`](../../../../core/entities/AdjuntoTicket/interfaces/AdjuntoTicket.md#permanente)
