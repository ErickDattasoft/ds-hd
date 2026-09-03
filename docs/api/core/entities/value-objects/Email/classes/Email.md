[**ds-hd**](../../../../../README.md)

***

[ds-hd](../../../../../README.md) / [core/entities/value-objects/Email](../README.md) / Email

# Class: Email

Correo normalizado (minúsculas, sin espacios). Value object: dos `Email` con el mismo
texto son equivalentes; se construye solo por la fábrica validadora.

## Properties

### value

> `readonly` **value**: `string`

## Methods

### create()

> `static` **create**(`raw`, `campo?`): `Email`

#### Parameters

##### raw

`string`

##### campo?

`string` = `'email'`

#### Returns

`Email`

***

### tryCreate()

> `static` **tryCreate**(`raw`): `Email` \| `null`

Igual que `create` pero devuelve `null` en vez de lanzar.

#### Parameters

##### raw

`string`

#### Returns

`Email` \| `null`

***

### equals()

> **equals**(`other`): `boolean`

#### Parameters

##### other

`Email`

#### Returns

`boolean`

***

### toString()

> **toString**(): `string`

#### Returns

`string`
