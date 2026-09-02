[**ds-hd**](../../../../../README.md)

***

[ds-hd](../../../../../README.md) / [core/entities/value-objects/Email](../README.md) / Email

# Class: Email

Defined in: core/entities/value-objects/Email.ts:9

Correo normalizado (minúsculas, sin espacios). Value object: dos `Email` con el mismo
texto son equivalentes; se construye solo por la fábrica validadora.

## Properties

### value

> `readonly` **value**: `string`

Defined in: core/entities/value-objects/Email.ts:10

## Methods

### create()

> `static` **create**(`raw`, `campo?`): `Email`

Defined in: core/entities/value-objects/Email.ts:12

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

Defined in: core/entities/value-objects/Email.ts:21

Igual que `create` pero devuelve `null` en vez de lanzar.

#### Parameters

##### raw

`string`

#### Returns

`Email` \| `null`

***

### equals()

> **equals**(`other`): `boolean`

Defined in: core/entities/value-objects/Email.ts:29

#### Parameters

##### other

`Email`

#### Returns

`boolean`

***

### toString()

> **toString**(): `string`

Defined in: core/entities/value-objects/Email.ts:33

#### Returns

`string`
