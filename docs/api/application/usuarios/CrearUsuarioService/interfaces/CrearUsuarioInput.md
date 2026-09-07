[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/usuarios/CrearUsuarioService](../README.md) / CrearUsuarioInput

# Interface: CrearUsuarioInput

Datos para dar de alta una cuenta de staff.

## Properties

### actor

> **actor**: [`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

***

### email

> **email**: `string`

***

### nombre

> **nombre**: `string`

***

### roles

> **roles**: (`"admin"` \| `"supervisor"` \| `"soporte"` \| `"ventas"` \| `"agente"` \| `"lectura"` \| `"cliente"`)[]

Uno o varios roles de staff.

***

### agente?

> `optional` **agente?**: `Partial`\<[`PerfilAgente`](../../../../core/entities/Usuario/interfaces/PerfilAgente.md)\>
