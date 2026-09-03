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

### createdAt

> **createdAt**: `Date`
