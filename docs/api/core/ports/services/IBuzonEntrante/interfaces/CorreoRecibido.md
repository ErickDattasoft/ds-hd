[**ds-hd**](../../../../../README.md)

***

[ds-hd](../../../../../README.md) / [core/ports/services/IBuzonEntrante](../README.md) / CorreoRecibido

# Interface: CorreoRecibido

Un correo recibido en el buzón, ya normalizado.

## Properties

### id

> **id**: `string`

***

### carpetaId

> **carpetaId**: `string`

Carpeta a la que pertenece (Zoho la pide para leer y para marcar como leído).

***

### de

> **de**: `string`

Correo del remitente, en minúsculas.

***

### nombreDe?

> `optional` **nombreDe?**: `string`

Nombre visible del remitente ("Erick Casas"), si el correo lo trae.

***

### asunto

> **asunto**: `string`

***

### cuerpo

> **cuerpo**: `string`

Texto plano ya sin HTML (la cita del hilo se recorta después, con `cuerpoSinCita`).

***

### recibidoEn

> **recibidoEn**: `Date`

***

### adjuntos?

> `optional` **adjuntos?**: `object`[]

Imágenes adjuntas (solo las que alguien adjuntó a propósito, no las incrustadas).

#### nombre

> **nombre**: `string`

#### contentType

> **contentType**: `string`

#### base64

> **base64**: `string`
