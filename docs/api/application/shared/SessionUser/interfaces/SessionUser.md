[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/shared/SessionUser](../README.md) / SessionUser

# Interface: SessionUser

Defined in: application/shared/SessionUser.ts:8

Vista del usuario autenticado que viaja en `req.user` y se pasa a los casos de uso
como `actor`. Incluye el conjunto EFECTIVO de permisos ya resuelto (rol + extras − revocados),
calculado en la capa de entrega para que `application/` no dependa del catálogo de permisos.

## Properties

### uid

> `readonly` **uid**: `string`

Defined in: application/shared/SessionUser.ts:9

***

### nombre

> `readonly` **nombre**: `string`

Defined in: application/shared/SessionUser.ts:10

***

### email

> `readonly` **email**: `string`

Defined in: application/shared/SessionUser.ts:11

***

### rol

> `readonly` **rol**: `"admin"` \| `"supervisor"` \| `"agente"` \| `"lectura"` \| `"cliente"`

Defined in: application/shared/SessionUser.ts:12

***

### empresaId

> `readonly` **empresaId**: `string` \| `null`

Defined in: application/shared/SessionUser.ts:13

***

### activo

> `readonly` **activo**: `boolean`

Defined in: application/shared/SessionUser.ts:14

***

### esStaff

> `readonly` **esStaff**: `boolean`

Defined in: application/shared/SessionUser.ts:15

***

### esCliente

> `readonly` **esCliente**: `boolean`

Defined in: application/shared/SessionUser.ts:16

***

### permisos

> `readonly` **permisos**: readonly `string`[]

Defined in: application/shared/SessionUser.ts:18

Permisos efectivos (`modulo:accion`).
