[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [core/entities/Usuario](../README.md) / UsuarioProps

# Interface: UsuarioProps

Props para construir un [Usuario](../classes/Usuario.md).

## Properties

### uid

> **uid**: `string`

***

### email

> **email**: `string`

***

### nombre

> **nombre**: `string`

***

### rol

> **rol**: `"admin"` \| `"supervisor"` \| `"soporte"` \| `"ventas"` \| `"agente"` \| `"lectura"` \| `"cliente"`

***

### permisosExtra?

> `optional` **permisosExtra?**: `string`[]

Permisos concedidos por encima de los de su rol.

***

### permisosRevocados?

> `optional` **permisosRevocados?**: `string`[]

Permisos retirados respecto a los de su rol.

***

### activo?

> `optional` **activo?**: `boolean`

***

### empresaId?

> `optional` **empresaId?**: `string` \| `null`

Empresa asociada; obligatoria para `rol === 'cliente'`.

***

### agente?

> `optional` **agente?**: `Partial`\<[`PerfilAgente`](PerfilAgente.md)\>

***

### createdAt?

> `optional` **createdAt?**: `Date`

***

### updatedAt?

> `optional` **updatedAt?**: `Date`

***

### lastLoginAt?

> `optional` **lastLoginAt?**: `Date` \| `null`
