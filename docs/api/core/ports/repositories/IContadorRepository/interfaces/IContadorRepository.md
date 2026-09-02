[**ds-hd**](../../../../../README.md)

***

[ds-hd](../../../../../README.md) / [core/ports/repositories/IContadorRepository](../README.md) / IContadorRepository

# Interface: IContadorRepository

Defined in: core/ports/repositories/IContadorRepository.ts:2

Contadores atómicos para folios consecutivos (`contadores/{nombre}`).

## Methods

### siguiente()

> **siguiente**(`nombre`): `Promise`\<`number`\>

Defined in: core/ports/repositories/IContadorRepository.ts:4

Incrementa el contador de forma transaccional y devuelve el nuevo valor.

#### Parameters

##### nombre

`string`

#### Returns

`Promise`\<`number`\>

***

### fijar()

> **fijar**(`nombre`, `valor`): `Promise`\<`void`\>

Defined in: core/ports/repositories/IContadorRepository.ts:6

Fija el valor (para inicializar tras una migración).

#### Parameters

##### nombre

`string`

##### valor

`number`

#### Returns

`Promise`\<`void`\>
