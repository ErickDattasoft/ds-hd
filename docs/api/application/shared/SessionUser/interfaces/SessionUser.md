[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/shared/SessionUser](../README.md) / SessionUser

# Interface: SessionUser

Vista del usuario autenticado que viaja en `req.user` y se pasa a los casos de uso
como `actor`. Incluye el conjunto EFECTIVO de permisos ya resuelto (rol + extras − revocados),
calculado en la capa de entrega para que `application/` no dependa del catálogo de permisos.

## Properties

### uid

> `readonly` **uid**: `string`

***

### nombre

> `readonly` **nombre**: `string`

***

### email

> `readonly` **email**: `string`

***

### roles

> `readonly` **roles**: readonly (`"admin"` \| `"supervisor"` \| `"soporte"` \| `"ventas"` \| `"agente"` \| `"lectura"` \| `"cliente"`)[]

Todos los roles asignados. Los permisos efectivos son la unión.

***

### rol

> `readonly` **rol**: `"admin"` \| `"supervisor"` \| `"soporte"` \| `"ventas"` \| `"agente"` \| `"lectura"` \| `"cliente"`

Rol de mayor alcance (para badges y `data-role`). Equivale a `roles[0]`.

***

### empresaId

> `readonly` **empresaId**: `string` \| `null`

***

### activo

> `readonly` **activo**: `boolean`

***

### esStaff

> `readonly` **esStaff**: `boolean`

***

### esCliente

> `readonly` **esCliente**: `boolean`

***

### esTecnico

> `readonly` **esTecnico**: `boolean`

¿Puede tomar tickets como técnico? (tiene `agente` o `soporte` entre sus roles).

***

### permisos

> `readonly` **permisos**: readonly `string`[]

Permisos efectivos (`modulo:accion`).

***

### firma?

> `readonly` `optional` **firma?**: `string` \| `null`

Firma que se agrega a las respuestas públicas de tickets, si la tiene configurada.

***

### encabezado?

> `readonly` `optional` **encabezado?**: `string` \| `null`

Encabezado/plantilla del usuario para redactar tickets (con `[fecha]`).
