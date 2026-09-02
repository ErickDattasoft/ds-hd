[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [core/entities/Ticket](../README.md) / TicketProps

# Interface: TicketProps

Defined in: core/entities/Ticket.ts:40

Props para construir un [Ticket](../classes/Ticket.md).

## Properties

### id

> **id**: `string`

Defined in: core/entities/Ticket.ts:41

***

### numero

> **numero**: `number`

Defined in: core/entities/Ticket.ts:42

***

### asunto

> **asunto**: `string`

Defined in: core/entities/Ticket.ts:43

***

### descripcion

> **descripcion**: `string`

Defined in: core/entities/Ticket.ts:44

***

### tipo

> **tipo**: `string`

Defined in: core/entities/Ticket.ts:45

***

### sistema?

> `optional` **sistema?**: `string` \| `null`

Defined in: core/entities/Ticket.ts:46

***

### estado

> **estado**: `string`

Defined in: core/entities/Ticket.ts:47

***

### prioridad

> **prioridad**: `"Baja"` \| `"Media"` \| `"Alta"` \| `"Urgente"`

Defined in: core/entities/Ticket.ts:48

***

### grupo?

> `optional` **grupo?**: `string` \| `null`

Defined in: core/entities/Ticket.ts:49

***

### canal

> **canal**: [`CanalTicket`](../type-aliases/CanalTicket.md)

Defined in: core/entities/Ticket.ts:50

***

### empresaId?

> `optional` **empresaId?**: `string` \| `null`

Defined in: core/entities/Ticket.ts:52

***

### empresaNombre?

> `optional` **empresaNombre?**: `string` \| `null`

Defined in: core/entities/Ticket.ts:53

***

### contactoId?

> `optional` **contactoId?**: `string` \| `null`

Defined in: core/entities/Ticket.ts:54

***

### contactoNombre?

> `optional` **contactoNombre?**: `string` \| `null`

Defined in: core/entities/Ticket.ts:55

***

### contactoCorreo?

> `optional` **contactoCorreo?**: `string` \| `null`

Defined in: core/entities/Ticket.ts:56

***

### agenteAsignadoUid?

> `optional` **agenteAsignadoUid?**: `string` \| `null`

Defined in: core/entities/Ticket.ts:58

***

### agenteAsignadoNombre?

> `optional` **agenteAsignadoNombre?**: `string` \| `null`

Defined in: core/entities/Ticket.ts:59

***

### origenPublicoId?

> `optional` **origenPublicoId?**: `string` \| `null`

Defined in: core/entities/Ticket.ts:61

***

### solicitanteUid?

> `optional` **solicitanteUid?**: `string` \| `null`

Defined in: core/entities/Ticket.ts:62

***

### creadoPorUid?

> `optional` **creadoPorUid?**: `string` \| `null`

Defined in: core/entities/Ticket.ts:63

***

### sla?

> `optional` **sla?**: `Partial`\<[`SlaState`](SlaState.md)\>

Defined in: core/entities/Ticket.ts:65

***

### facturacion?

> `optional` **facturacion?**: `Partial`\<[`FacturacionState`](FacturacionState.md)\>

Defined in: core/entities/Ticket.ts:66

***

### tiempoTrabajadoMs?

> `optional` **tiempoTrabajadoMs?**: `number`

Defined in: core/entities/Ticket.ts:67

***

### abiertoEn?

> `optional` **abiertoEn?**: `Date`

Defined in: core/entities/Ticket.ts:69

***

### ultimoCambioEstadoEn?

> `optional` **ultimoCambioEstadoEn?**: `Date`

Defined in: core/entities/Ticket.ts:70

***

### primeraRespuestaEn?

> `optional` **primeraRespuestaEn?**: `Date` \| `null`

Defined in: core/entities/Ticket.ts:71

***

### resueltoEn?

> `optional` **resueltoEn?**: `Date` \| `null`

Defined in: core/entities/Ticket.ts:72

***

### cerradoEn?

> `optional` **cerradoEn?**: `Date` \| `null`

Defined in: core/entities/Ticket.ts:73

***

### createdAt?

> `optional` **createdAt?**: `Date`

Defined in: core/entities/Ticket.ts:74

***

### updatedAt?

> `optional` **updatedAt?**: `Date`

Defined in: core/entities/Ticket.ts:75

***

### historialEstados?

> `optional` **historialEstados?**: [`CambioEstado`](CambioEstado.md)[]

Defined in: core/entities/Ticket.ts:76
