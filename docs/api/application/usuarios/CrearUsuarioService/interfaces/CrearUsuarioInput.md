[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/usuarios/CrearUsuarioService](../README.md) / CrearUsuarioInput

# Interface: CrearUsuarioInput

Defined in: application/usuarios/CrearUsuarioService.ts:15

Datos para dar de alta una cuenta de staff.

## Properties

### actor

> **actor**: [`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

Defined in: application/usuarios/CrearUsuarioService.ts:16

***

### email

> **email**: `string`

Defined in: application/usuarios/CrearUsuarioService.ts:17

***

### nombre

> **nombre**: `string`

Defined in: application/usuarios/CrearUsuarioService.ts:18

***

### rol

> **rol**: `"admin"` \| `"supervisor"` \| `"agente"` \| `"lectura"` \| `"cliente"`

Defined in: application/usuarios/CrearUsuarioService.ts:19

***

### agente?

> `optional` **agente?**: `Partial`\<[`PerfilAgente`](../../../../core/entities/Usuario/interfaces/PerfilAgente.md)\>

Defined in: application/usuarios/CrearUsuarioService.ts:20
