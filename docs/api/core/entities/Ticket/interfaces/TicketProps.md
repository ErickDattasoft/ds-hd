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

### solicitadoPor?

> `optional` **solicitadoPor?**: `string` \| `null`

Quién pidió el ticket (texto libre, no necesariamente un contacto registrado).

***

### canalizadoA?

> `optional` **canalizadoA?**: `string` \| `null`

Área o persona a la que se canaliza el ticket (texto libre).

***

### notasInternas?

> `optional` **notasInternas?**: `string` \| `null`

Notas internas persistentes (NO se envían al cliente). Aparte del hilo de conversación.

***

### cc?

> `optional` **cc?**: `string`[]

Correos en copia en las notificaciones del ticket.

***

### cco?

> `optional` **cco?**: `string`[]

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

> `optional` **facturacion?**: `Partial`\<[`FacturacionState`](FacturacionState.md)\> & `object`

`facturado` (booleano) es el esquema viejo, solo para respaldo al leer datos guardados.

#### Type Declaration

##### facturado?

> `optional` **facturado?**: `boolean`

***

### agenda?

> `optional` **agenda?**: [`AgendaTicket`](../../value-objects/AgendaTicket/interfaces/AgendaTicket.md) \| `null`

Programación de atención ("📅 Programar atención"); `null`/ausente = sin programar.

***

### tiempoTrabajadoMs?

> `optional` **tiempoTrabajadoMs?**: `number`

***

### tiempoTrabajadoManualMs?

> `optional` **tiempoTrabajadoManualMs?**: `number` \| `null`

Ajuste manual del tiempo trabajado; `null` = usar el cálculo automático.

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

***

### archivado?

> `optional` **archivado?**: `boolean`
