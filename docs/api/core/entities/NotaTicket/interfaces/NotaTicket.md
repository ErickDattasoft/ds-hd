[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [core/entities/NotaTicket](../README.md) / NotaTicket

# Interface: NotaTicket

Nota en la conversación de un ticket. `interna` no es visible para el cliente en el portal.

## Properties

### id

> **id**: `string`

***

### tipo

> **tipo**: `"publica"` \| `"interna"`

***

### cuerpo

> **cuerpo**: `string`

***

### autorUid

> **autorUid**: `string`

***

### autorNombre

> **autorNombre**: `string`

***

### createdAt

> **createdAt**: `Date`

***

### adjuntoIds?

> `optional` **adjuntoIds?**: `string`[]

Imágenes de la nota (ids de `tickets_adjuntos`): capturas de una respuesta por correo o del CRM.

***

### correoDe?

> `optional` **correoDe?**: `string`

Correo de quien la escribió, si llegó por correo (para distinguirla de las del CRM).
