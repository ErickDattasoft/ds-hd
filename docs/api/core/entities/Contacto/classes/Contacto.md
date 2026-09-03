[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [core/entities/Contacto](../README.md) / Contacto

# Class: Contacto

Persona de contacto asociada a una empresa.

## Constructors

### Constructor

> **new Contacto**(`props`): `Contacto`

#### Parameters

##### props

[`ContactoProps`](../interfaces/ContactoProps.md)

#### Returns

`Contacto`

## Properties

### id

> `readonly` **id**: `string`

***

### nombre

> **nombre**: `string`

***

### empresaId

> **empresaId**: `string`

***

### puesto

> **puesto**: `string` \| `null`

***

### email

> **email**: `string` \| `null`

***

### telefono

> **telefono**: `string` \| `null`

***

### celular

> **celular**: `string` \| `null`

***

### esPortal

> **esPortal**: `boolean`

***

### uid

> **uid**: `string` \| `null`

***

### notas

> **notas**: `string` \| `null`

***

### activo

> **activo**: `boolean`

***

### createdAt

> `readonly` **createdAt**: `Date`

***

### updatedAt

> **updatedAt**: `Date`

## Methods

### vincularPortal()

> **vincularPortal**(`uid`, `ahora`): `void`

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

#### Parameters

##### ahora

`Date`

#### Returns

`void`

***

### restaurar()

> **restaurar**(`ahora`): `void`

#### Parameters

##### ahora

`Date`

#### Returns

`void`
