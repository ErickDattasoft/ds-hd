[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [core/entities/Empresa](../README.md) / Empresa

# Class: Empresa

Empresa/cliente del CRM.

## Constructors

### Constructor

> **new Empresa**(`props`): `Empresa`

#### Parameters

##### props

[`EmpresaProps`](../interfaces/EmpresaProps.md)

#### Returns

`Empresa`

## Properties

### id

> `readonly` **id**: `string`

***

### nombre

> **nombre**: `string`

***

### rfc

> **rfc**: `string` \| `null`

***

### razonSocial

> **razonSocial**: `string` \| `null`

***

### direccion

> **direccion**: `string` \| `null`

***

### telefono

> **telefono**: `string` \| `null`

***

### email

> **email**: `string` \| `null`

***

### sistemasContratados

> **sistemasContratados**: `string`[]

***

### vigencias

> **vigencias**: `Record`\<`string`, `string`\>

***

### contactoPrincipalId

> **contactoPrincipalId**: `string` \| `null`

***

### notas

> **notas**: `string` \| `null`

***

### activa

> **activa**: `boolean`

***

### creadoPorUid

> `readonly` **creadoPorUid**: `string` \| `null`

***

### createdAt

> `readonly` **createdAt**: `Date`

***

### updatedAt

> **updatedAt**: `Date`

## Methods

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
