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

### rol

> `readonly` **rol**: `"admin"` \| `"supervisor"` \| `"soporte"` \| `"ventas"` \| `"agente"` \| `"lectura"` \| `"cliente"`

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

### permisos

> `readonly` **permisos**: readonly `string`[]

Permisos efectivos (`modulo:accion`).
