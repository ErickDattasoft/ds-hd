[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/portal/CrearTicketPortalService](../README.md) / CrearTicketPortalInput

# Interface: CrearTicketPortalInput

Datos del formulario del portal para que un cliente abra un ticket.

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

> **prioridad**: `string`

***

### sistema?

> `optional` **sistema?**: `string`

***

### empresaId?

> `optional` **empresaId?**: `string`

Para qué empresa es, si la cuenta lleva varias; si no se indica, la principal.

***

### empresaNombre?

> `optional` **empresaNombre?**: `string` \| `null`

Nombre de esa empresa, para que el ticket la muestre en las listas del staff.
