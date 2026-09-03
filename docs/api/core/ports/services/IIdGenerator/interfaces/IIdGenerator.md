[**ds-hd**](../../../../../README.md)

***

[ds-hd](../../../../../README.md) / [core/ports/services/IIdGenerator](../README.md) / IIdGenerator

# Interface: IIdGenerator

Puerto para generar identificadores opacos (ids de documento, tokens de invitación).
Aislado para poder inyectar una secuencia determinista en los tests.

## Methods

### newId()

> **newId**(): `string`

Id corto para documentos (colecciones de Firestore).

#### Returns

`string`

***

### newToken()

> **newToken**(): `string`

Token largo, apto para URLs de un solo uso (invitaciones, reseteo de contraseña).

#### Returns

`string`
