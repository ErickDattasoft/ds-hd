[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/tickets/dto](../README.md) / CrearTicketInput

# Interface: CrearTicketInput

Datos para crear un ticket desde cualquier canal (staff, portal o público).

## Properties

### actor

> **actor**: [`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

***

### asunto

> **asunto**: `string`

***

### descripcion

> **descripcion**: `string`

***

### tipo

> **tipo**: `string`

***

### prioridad

> **prioridad**: `"Baja"` \| `"Media"` \| `"Alta"` \| `"Urgente"`

***

### sistema?

> `optional` **sistema?**: `string` \| `null`

***

### grupo?

> `optional` **grupo?**: `string` \| `null`

***

### canal?

> `optional` **canal?**: [`CanalTicket`](../../../../core/entities/Ticket/type-aliases/CanalTicket.md)

***

### empresaId?

> `optional` **empresaId?**: `string` \| `null`

***

### empresaNombre?

> `optional` **empresaNombre?**: `string` \| `null`

***

### contactoId?

> `optional` **contactoId?**: `string` \| `null`

***

### contactoNombre?

> `optional` **contactoNombre?**: `string` \| `null`

***

### contactoCorreo?

> `optional` **contactoCorreo?**: `string` \| `null`

***

### solicitanteUid?

> `optional` **solicitanteUid?**: `string` \| `null`

***

### origenPublicoId?

> `optional` **origenPublicoId?**: `string` \| `null`

***

### asignarAlActor?

> `optional` **asignarAlActor?**: `boolean`

El agente que crea se autoasigna.

***

### estadoFacturacion?

> `optional` **estadoFacturacion?**: `"no_facturado"` \| `"facturado"` \| `"no_aplica"` \| `"factura_mensual"` \| `"consulta_sin_costo"`

Si se omite, se infiere del tipo (`tiposFacturables`) — solo el alta desde el back-office lo captura.

***

### agenda?

> `optional` **agenda?**: [`AgendaTicket`](../../../../core/entities/value-objects/AgendaTicket/interfaces/AgendaTicket.md) \| `null`

Programación de atención opcional, solo desde el alta del back-office.
