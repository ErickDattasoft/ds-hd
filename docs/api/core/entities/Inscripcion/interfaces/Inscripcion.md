[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [core/entities/Inscripcion](../README.md) / Inscripcion

# Interface: Inscripcion

Inscripción de una persona a un evento (`eventos/{id}/inscripciones/{insId}`).

## Properties

### id

> **id**: `string`

***

### eventoId

> **eventoId**: `string`

***

### nombre

> **nombre**: `string`

***

### email

> **email**: `string`

***

### telefono

> **telefono**: `string` \| `null`

***

### empresa

> **empresa**: `string` \| `null`

***

### estado

> **estado**: [`EstadoInscripcion`](../type-aliases/EstadoInscripcion.md)

***

### origen

> **origen**: `"publico"` \| `"staff"`

***

### correoEstado

> **correoEstado**: `"pendiente"` \| `"entregado"` \| `"rebotado"` \| `null`

Estado del último correo enviado, actualizado por el webhook de Brevo.

***

### recordatoriosEnviados

> **recordatoriosEnviados**: `string`[]

***

### ip

> **ip**: `string` \| `null`

IP desde la que se registró (forense + límite por IP); `null` para altas de staff.

***

### correoSospechoso

> **correoSospechoso**: `boolean`

`true` si el dominio del correo es de un servicio desechable conocido — solo se marca 🚩.

***

### asistira

> **asistira**: `string` \| `null`

Respuesta libre del formulario público — "Sí"/"No"/"Tal vez". `null` para altas de staff.

***

### usaSistema

> **usaSistema**: `string` \| `null`

Respuesta a "¿usas [sistema]?" — solo si el evento tiene `sistema`; si no, `null`.

***

### fuente

> **fuente**: `string` \| `null`

Cómo se enteró del evento (Facebook/Instagram/LinkedIn/...), texto libre.

***

### deseaCanalWhatsapp

> **deseaCanalWhatsapp**: `boolean`

Marcó que quiere unirse al canal de WhatsApp de avisos/novedades.

***

### createdAt

> **createdAt**: `Date`
