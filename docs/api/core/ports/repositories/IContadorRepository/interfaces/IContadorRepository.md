[**ds-hd**](../../../../../README.md)

***

[ds-hd](../../../../../README.md) / [core/ports/repositories/IContadorRepository](../README.md) / IContadorRepository

# Interface: IContadorRepository

Contadores atómicos para folios consecutivos (`contadores/{nombre}`).

## Methods

### siguiente()

> **siguiente**(`nombre`): `Promise`\<`number`\>

Incrementa el contador de forma transaccional y devuelve el nuevo valor.

#### Parameters

##### nombre

`string`

#### Returns

`Promise`\<`number`\>

***

### fijar()

> **fijar**(`nombre`, `valor`): `Promise`\<`void`\>

Fija el valor (para inicializar tras una migración).

#### Parameters

##### nombre

`string`

##### valor

`number`

#### Returns

`Promise`\<`void`\>
