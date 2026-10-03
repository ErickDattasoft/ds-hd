[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/tickets/dto](../README.md) / RegistrarNotaInput

# Interface: RegistrarNotaInput

Datos para agregar una nota (pública o interna) a un ticket.

## Properties

### actor

> **actor**: [`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

***

### ticketId

> **ticketId**: `string`

***

### cuerpo

> **cuerpo**: `string`

***

### tipo

> **tipo**: `"publica"` \| `"interna"`

***

### cc?

> `optional` **cc?**: `string`[]

"Con copia" de esta respuesta (además de los CC del ticket). Solo notas públicas.

***

### imagenes?

> `optional` **imagenes?**: `object`[]

Capturas de pantalla (solo imágenes ≤700 KB): quedan como adjuntos y se ven en la nota.

#### nombre

> **nombre**: `string`

#### contentType

> **contentType**: `string`

#### base64

> **base64**: `string`
