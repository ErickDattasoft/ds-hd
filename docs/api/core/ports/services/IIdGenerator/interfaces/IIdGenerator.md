[**ds-hd**](../../../../../README.md)

***

[ds-hd](../../../../../README.md) / [core/ports/services/IIdGenerator](../README.md) / IIdGenerator

# Interface: IIdGenerator

Defined in: core/ports/services/IIdGenerator.ts:5

Puerto para generar identificadores opacos (ids de documento, tokens de invitación).
Aislado para poder inyectar una secuencia determinista en los tests.

## Methods

### newId()

> **newId**(): `string`

Defined in: core/ports/services/IIdGenerator.ts:7

Id corto para documentos (colecciones de Firestore).

#### Returns

`string`

***

### newToken()

> **newToken**(): `string`

Defined in: core/ports/services/IIdGenerator.ts:9

Token largo, apto para URLs de un solo uso (invitaciones, reseteo de contraseña).

#### Returns

`string`
