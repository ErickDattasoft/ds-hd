[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [core/entities/NotaTicket](../README.md) / EventoTicket

# Interface: EventoTicket

Defined in: core/entities/NotaTicket.ts:15

Entrada del registro de actividad de un ticket (append-only). Sirve de bitácora local
visible en el detalle.

## Properties

### id

> **id**: `string`

Defined in: core/entities/NotaTicket.ts:16

***

### tipo

> **tipo**: `"correo"` \| `"creacion"` \| `"cambio_estado"` \| `"asignacion"` \| `"nota"` \| `"sla_incumplido"` \| `"facturacion"`

Defined in: core/entities/NotaTicket.ts:17

***

### resumen

> **resumen**: `string`

Defined in: core/entities/NotaTicket.ts:18

***

### actorUid

> **actorUid**: `string` \| `null`

Defined in: core/entities/NotaTicket.ts:19

***

### actorNombre

> **actorNombre**: `string` \| `null`

Defined in: core/entities/NotaTicket.ts:20

***

### at

> **at**: `Date`

Defined in: core/entities/NotaTicket.ts:21
