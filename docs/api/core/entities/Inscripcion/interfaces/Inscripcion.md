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

### createdAt

> **createdAt**: `Date`
