[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [core/entities/Usuario](../README.md) / UsuarioProps

# Interface: UsuarioProps

Defined in: core/entities/Usuario.ts:15

Props para construir un [Usuario](../classes/Usuario.md).

## Properties

### uid

> **uid**: `string`

Defined in: core/entities/Usuario.ts:16

***

### email

> **email**: `string`

Defined in: core/entities/Usuario.ts:17

***

### nombre

> **nombre**: `string`

Defined in: core/entities/Usuario.ts:18

***

### rol

> **rol**: `"admin"` \| `"supervisor"` \| `"agente"` \| `"lectura"` \| `"cliente"`

Defined in: core/entities/Usuario.ts:19

***

### permisosExtra?

> `optional` **permisosExtra?**: `string`[]

Defined in: core/entities/Usuario.ts:21

Permisos concedidos por encima de los de su rol.

***

### permisosRevocados?

> `optional` **permisosRevocados?**: `string`[]

Defined in: core/entities/Usuario.ts:23

Permisos retirados respecto a los de su rol.

***

### activo?

> `optional` **activo?**: `boolean`

Defined in: core/entities/Usuario.ts:24

***

### empresaId?

> `optional` **empresaId?**: `string` \| `null`

Defined in: core/entities/Usuario.ts:26

Empresa asociada; obligatoria para `rol === 'cliente'`.

***

### agente?

> `optional` **agente?**: `Partial`\<[`PerfilAgente`](PerfilAgente.md)\>

Defined in: core/entities/Usuario.ts:27

***

### createdAt?

> `optional` **createdAt?**: `Date`

Defined in: core/entities/Usuario.ts:28

***

### updatedAt?

> `optional` **updatedAt?**: `Date`

Defined in: core/entities/Usuario.ts:29

***

### lastLoginAt?

> `optional` **lastLoginAt?**: `Date` \| `null`

Defined in: core/entities/Usuario.ts:30
