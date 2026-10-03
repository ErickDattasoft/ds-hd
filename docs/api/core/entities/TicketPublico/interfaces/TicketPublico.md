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

### imagenes?

> `optional` **imagenes?**: [`ImagenTicketPublico`](ImagenTicketPublico.md)[]

Hasta [MAX\_IMAGENES\_PUBLICO](../variables/MAX_IMAGENES_PUBLICO.md) imágenes (data URL, ya comprimidas por el navegador).

***

### origen?

> `optional` **origen?**: `"correo"` \| `"formulario"`

De dónde llegó: el formulario público o un correo sin número de ticket (solicitud por correo).

***

### estado

> **estado**: `"pendiente"` \| `"aceptado"` \| `"rechazado"`

***

### ticketNumero

> **ticketNumero**: `number` \| `null`

***

### createdAt

> **createdAt**: `Date`
