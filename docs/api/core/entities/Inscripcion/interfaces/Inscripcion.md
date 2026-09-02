[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [core/entities/Inscripcion](../README.md) / Inscripcion

# Interface: Inscripcion

Defined in: core/entities/Inscripcion.ts:4

Inscripción de una persona a un evento (`eventos/{id}/inscripciones/{insId}`).

## Properties

### id

> **id**: `string`

Defined in: core/entities/Inscripcion.ts:5

***

### eventoId

> **eventoId**: `string`

Defined in: core/entities/Inscripcion.ts:6

***

### nombre

> **nombre**: `string`

Defined in: core/entities/Inscripcion.ts:7

***

### email

> **email**: `string`

Defined in: core/entities/Inscripcion.ts:8

***

### telefono

> **telefono**: `string` \| `null`

Defined in: core/entities/Inscripcion.ts:9

***

### empresa

> **empresa**: `string` \| `null`

Defined in: core/entities/Inscripcion.ts:10

***

### estado

> **estado**: [`EstadoInscripcion`](../type-aliases/EstadoInscripcion.md)

Defined in: core/entities/Inscripcion.ts:11

***

### origen

> **origen**: `"publico"` \| `"staff"`

Defined in: core/entities/Inscripcion.ts:12

***

### correoEstado

> **correoEstado**: `"pendiente"` \| `"entregado"` \| `"rebotado"` \| `null`

Defined in: core/entities/Inscripcion.ts:14

Estado del último correo enviado, actualizado por el webhook de Brevo.

***

### recordatoriosEnviados

> **recordatoriosEnviados**: `string`[]

Defined in: core/entities/Inscripcion.ts:15

***

### createdAt

> **createdAt**: `Date`

Defined in: core/entities/Inscripcion.ts:16
