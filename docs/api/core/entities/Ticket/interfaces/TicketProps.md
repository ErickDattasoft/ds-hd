[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [core/entities/Ticket](../README.md) / TicketProps

# Interface: TicketProps

Props para construir un [Ticket](../classes/Ticket.md).

## Properties

### id

> **id**: `string`

***

### numero

> **numero**: `number`

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

### sistema?

> `optional` **sistema?**: `string` \| `null`

***

### estado

> **estado**: `string`

***

### prioridad

> **prioridad**: `"Baja"` \| `"Media"` \| `"Alta"` \| `"Urgente"`

***

### grupo?

> `optional` **grupo?**: `string` \| `null`

***

### canal

> **canal**: [`CanalTicket`](../type-aliases/CanalTicket.md)

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

### agenteAsignadoUid?

> `optional` **agenteAsignadoUid?**: `string` \| `null`

***

### agenteAsignadoNombre?

> `optional` **agenteAsignadoNombre?**: `string` \| `null`

***

### origenPublicoId?

> `optional` **origenPublicoId?**: `string` \| `null`

***

### solicitanteUid?

> `optional` **solicitanteUid?**: `string` \| `null`

***

### creadoPorUid?

> `optional` **creadoPorUid?**: `string` \| `null`

***

### sla?

> `optional` **sla?**: `Partial`\<[`SlaState`](SlaState.md)\>

***

### facturacion?

> `optional` **facturacion?**: `Partial`\<[`FacturacionState`](FacturacionState.md)\>

***

### tiempoTrabajadoMs?

> `optional` **tiempoTrabajadoMs?**: `number`

***

### abiertoEn?

> `optional` **abiertoEn?**: `Date`

***

### ultimoCambioEstadoEn?

> `optional` **ultimoCambioEstadoEn?**: `Date`

***

### primeraRespuestaEn?

> `optional` **primeraRespuestaEn?**: `Date` \| `null`

***

### resueltoEn?

> `optional` **resueltoEn?**: `Date` \| `null`

***

### cerradoEn?

> `optional` **cerradoEn?**: `Date` \| `null`

***

### createdAt?

> `optional` **createdAt?**: `Date`

***

### updatedAt?

> `optional` **updatedAt?**: `Date`

***

### historialEstados?

> `optional` **historialEstados?**: [`CambioEstado`](CambioEstado.md)[]
