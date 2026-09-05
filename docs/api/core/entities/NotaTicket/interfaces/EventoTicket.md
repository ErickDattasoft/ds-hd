[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [core/entities/NotaTicket](../README.md) / EventoTicket

# Interface: EventoTicket

Entrada del registro de actividad de un ticket (append-only). Sirve de bitácora local
visible en el detalle.

## Properties

### id

> **id**: `string`

***

### tipo

> **tipo**: `"correo"` \| `"creacion"` \| `"cambio_estado"` \| `"asignacion"` \| `"nota"` \| `"sla_incumplido"` \| `"facturacion"` \| `"agenda"`

***

### resumen

> **resumen**: `string`

***

### actorUid

> **actorUid**: `string` \| `null`

***

### actorNombre

> **actorNombre**: `string` \| `null`

***

### at

> **at**: `Date`
