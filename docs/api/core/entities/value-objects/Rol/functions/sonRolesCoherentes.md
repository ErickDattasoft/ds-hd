[**ds-hd**](../../../../../README.md)

***

[ds-hd](../../../../../README.md) / [core/entities/value-objects/Rol](../README.md) / sonRolesCoherentes

# Function: sonRolesCoherentes()

> **sonRolesCoherentes**(`roles`): `object`

Regla de coherencia del conjunto de roles: `cliente` es exclusivo (nunca junto a roles de
staff) y el conjunto no puede quedar vacío.

## Parameters

### roles

readonly (`"admin"` \| `"supervisor"` \| `"soporte"` \| `"ventas"` \| `"agente"` \| `"lectura"` \| `"cliente"`)[]

## Returns

`object`

### ok

> **ok**: `boolean`

### error?

> `optional` **error?**: `string`
