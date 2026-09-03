[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/usuarios/ActualizarUsuarioService](../README.md) / ActualizarUsuarioInput

# Interface: ActualizarUsuarioInput

Campos editables de un usuario; todos opcionales salvo `uid` (solo se aplica lo enviado).

## Properties

### actor

> **actor**: [`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

***

### uid

> **uid**: `string`

***

### nombre?

> `optional` **nombre?**: `string`

***

### rol?

> `optional` **rol?**: `"admin"` \| `"supervisor"` \| `"soporte"` \| `"ventas"` \| `"agente"` \| `"lectura"` \| `"cliente"`

***

### activo?

> `optional` **activo?**: `boolean`

***

### empresaId?

> `optional` **empresaId?**: `string` \| `null`

***

### permisosExtra?

> `optional` **permisosExtra?**: `string`[]

***

### permisosRevocados?

> `optional` **permisosRevocados?**: `string`[]

***

### agente?

> `optional` **agente?**: `Partial`\<[`PerfilAgente`](../../../../core/entities/Usuario/interfaces/PerfilAgente.md)\>
