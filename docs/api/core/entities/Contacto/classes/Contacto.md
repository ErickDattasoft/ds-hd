[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [core/entities/Contacto](../README.md) / Contacto

# Class: Contacto

Defined in: core/entities/Contacto.ts:24

Persona de contacto asociada a una empresa.

## Constructors

### Constructor

> **new Contacto**(`props`): `Contacto`

Defined in: core/entities/Contacto.ts:39

#### Parameters

##### props

[`ContactoProps`](../interfaces/ContactoProps.md)

#### Returns

`Contacto`

## Properties

### id

> `readonly` **id**: `string`

Defined in: core/entities/Contacto.ts:25

***

### nombre

> **nombre**: `string`

Defined in: core/entities/Contacto.ts:26

***

### empresaId

> **empresaId**: `string`

Defined in: core/entities/Contacto.ts:27

***

### puesto

> **puesto**: `string` \| `null`

Defined in: core/entities/Contacto.ts:28

***

### email

> **email**: `string` \| `null`

Defined in: core/entities/Contacto.ts:29

***

### telefono

> **telefono**: `string` \| `null`

Defined in: core/entities/Contacto.ts:30

***

### celular

> **celular**: `string` \| `null`

Defined in: core/entities/Contacto.ts:31

***

### esPortal

> **esPortal**: `boolean`

Defined in: core/entities/Contacto.ts:32

***

### uid

> **uid**: `string` \| `null`

Defined in: core/entities/Contacto.ts:33

***

### notas

> **notas**: `string` \| `null`

Defined in: core/entities/Contacto.ts:34

***

### activo

> **activo**: `boolean`

Defined in: core/entities/Contacto.ts:35

***

### createdAt

> `readonly` **createdAt**: `Date`

Defined in: core/entities/Contacto.ts:36

***

### updatedAt

> **updatedAt**: `Date`

Defined in: core/entities/Contacto.ts:37

## Methods

### vincularPortal()

> **vincularPortal**(`uid`, `ahora`): `void`

Defined in: core/entities/Contacto.ts:61

#### Parameters

##### uid

`string`

##### ahora

`Date`

#### Returns

`void`

***

### archivar()

> **archivar**(`ahora`): `void`

Defined in: core/entities/Contacto.ts:66

#### Parameters

##### ahora

`Date`

#### Returns

`void`

***

### restaurar()

> **restaurar**(`ahora`): `void`

Defined in: core/entities/Contacto.ts:70

#### Parameters

##### ahora

`Date`

#### Returns

`void`
