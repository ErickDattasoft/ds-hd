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

### agenteUid?

> `optional` **agenteUid?**: `string` \| `null`

Asignar a un agente concreto al crear (staff con `tickets:asignar`).

***

### estado?

> `optional` **estado?**: `string` \| `null`

Estado inicial elegido (si no, `estadoInicial` de la config).

***

### solicitadoPor?

> `optional` **solicitadoPor?**: `string` \| `null`

Quién pidió el ticket (texto libre).

***

### canalizadoA?

> `optional` **canalizadoA?**: `string` \| `null`

Área/persona a la que se canaliza (texto libre).

***

### notasInternas?

> `optional` **notasInternas?**: `string` \| `null`

Notas internas iniciales (solo staff con permiso).

***

### cc?

> `optional` **cc?**: `string`[]

Correos en copia de las notificaciones del ticket.

***

### cco?

> `optional` **cco?**: `string`[]

***

### estadoFacturacion?

> `optional` **estadoFacturacion?**: `"no_facturado"` \| `"facturado"` \| `"no_aplica"` \| `"factura_mensual"` \| `"consulta_sin_costo"`

Si se omite, se infiere del tipo (`tiposFacturables`) — solo el alta desde el back-office lo captura.

***

### agenda?

> `optional` **agenda?**: [`AgendaTicket`](../../../../core/entities/value-objects/AgendaTicket/interfaces/AgendaTicket.md) \| `null`

Programación de atención opcional, solo desde el alta del back-office.
