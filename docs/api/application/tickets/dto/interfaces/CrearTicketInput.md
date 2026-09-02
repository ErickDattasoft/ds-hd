[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/tickets/dto](../README.md) / CrearTicketInput

# Interface: CrearTicketInput

Defined in: application/tickets/dto.ts:6

Datos para crear un ticket desde cualquier canal (staff, portal o público).

## Properties

### actor

> **actor**: [`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

Defined in: application/tickets/dto.ts:7

***

### asunto

> **asunto**: `string`

Defined in: application/tickets/dto.ts:8

***

### descripcion

> **descripcion**: `string`

Defined in: application/tickets/dto.ts:9

***

### tipo

> **tipo**: `string`

Defined in: application/tickets/dto.ts:10

***

### prioridad

> **prioridad**: `"Baja"` \| `"Media"` \| `"Alta"` \| `"Urgente"`

Defined in: application/tickets/dto.ts:11

***

### sistema?

> `optional` **sistema?**: `string` \| `null`

Defined in: application/tickets/dto.ts:12

***

### grupo?

> `optional` **grupo?**: `string` \| `null`

Defined in: application/tickets/dto.ts:13

***

### canal?

> `optional` **canal?**: [`CanalTicket`](../../../../core/entities/Ticket/type-aliases/CanalTicket.md)

Defined in: application/tickets/dto.ts:14

***

### empresaId?

> `optional` **empresaId?**: `string` \| `null`

Defined in: application/tickets/dto.ts:15

***

### empresaNombre?

> `optional` **empresaNombre?**: `string` \| `null`

Defined in: application/tickets/dto.ts:16

***

### contactoId?

> `optional` **contactoId?**: `string` \| `null`

Defined in: application/tickets/dto.ts:17

***

### contactoNombre?

> `optional` **contactoNombre?**: `string` \| `null`

Defined in: application/tickets/dto.ts:18

***

### contactoCorreo?

> `optional` **contactoCorreo?**: `string` \| `null`

Defined in: application/tickets/dto.ts:19

***

### solicitanteUid?

> `optional` **solicitanteUid?**: `string` \| `null`

Defined in: application/tickets/dto.ts:20

***

### origenPublicoId?

> `optional` **origenPublicoId?**: `string` \| `null`

Defined in: application/tickets/dto.ts:21

***

### asignarAlActor?

> `optional` **asignarAlActor?**: `boolean`

Defined in: application/tickets/dto.ts:23

El agente que crea se autoasigna.
