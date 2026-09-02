[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/usuarios/ActualizarUsuarioService](../README.md) / ActualizarUsuarioInput

# Interface: ActualizarUsuarioInput

Defined in: application/usuarios/ActualizarUsuarioService.ts:11

Campos editables de un usuario; todos opcionales salvo `uid` (solo se aplica lo enviado).

## Properties

### actor

> **actor**: [`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

Defined in: application/usuarios/ActualizarUsuarioService.ts:12

***

### uid

> **uid**: `string`

Defined in: application/usuarios/ActualizarUsuarioService.ts:13

***

### nombre?

> `optional` **nombre?**: `string`

Defined in: application/usuarios/ActualizarUsuarioService.ts:14

***

### rol?

> `optional` **rol?**: `"admin"` \| `"supervisor"` \| `"agente"` \| `"lectura"` \| `"cliente"`

Defined in: application/usuarios/ActualizarUsuarioService.ts:15

***

### activo?

> `optional` **activo?**: `boolean`

Defined in: application/usuarios/ActualizarUsuarioService.ts:16

***

### empresaId?

> `optional` **empresaId?**: `string` \| `null`

Defined in: application/usuarios/ActualizarUsuarioService.ts:17

***

### permisosExtra?

> `optional` **permisosExtra?**: `string`[]

Defined in: application/usuarios/ActualizarUsuarioService.ts:18

***

### permisosRevocados?

> `optional` **permisosRevocados?**: `string`[]

Defined in: application/usuarios/ActualizarUsuarioService.ts:19

***

### agente?

> `optional` **agente?**: `Partial`\<[`PerfilAgente`](../../../../core/entities/Usuario/interfaces/PerfilAgente.md)\>

Defined in: application/usuarios/ActualizarUsuarioService.ts:20
