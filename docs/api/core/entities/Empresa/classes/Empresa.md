[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [core/entities/Empresa](../README.md) / Empresa

# Class: Empresa

Defined in: core/entities/Empresa.ts:24

Empresa/cliente del CRM.

## Constructors

### Constructor

> **new Empresa**(`props`): `Empresa`

Defined in: core/entities/Empresa.ts:41

#### Parameters

##### props

[`EmpresaProps`](../interfaces/EmpresaProps.md)

#### Returns

`Empresa`

## Properties

### id

> `readonly` **id**: `string`

Defined in: core/entities/Empresa.ts:25

***

### nombre

> **nombre**: `string`

Defined in: core/entities/Empresa.ts:26

***

### rfc

> **rfc**: `string` \| `null`

Defined in: core/entities/Empresa.ts:27

***

### razonSocial

> **razonSocial**: `string` \| `null`

Defined in: core/entities/Empresa.ts:28

***

### direccion

> **direccion**: `string` \| `null`

Defined in: core/entities/Empresa.ts:29

***

### telefono

> **telefono**: `string` \| `null`

Defined in: core/entities/Empresa.ts:30

***

### email

> **email**: `string` \| `null`

Defined in: core/entities/Empresa.ts:31

***

### sistemasContratados

> **sistemasContratados**: `string`[]

Defined in: core/entities/Empresa.ts:32

***

### vigencias

> **vigencias**: `Record`\<`string`, `string`\>

Defined in: core/entities/Empresa.ts:33

***

### contactoPrincipalId

> **contactoPrincipalId**: `string` \| `null`

Defined in: core/entities/Empresa.ts:34

***

### notas

> **notas**: `string` \| `null`

Defined in: core/entities/Empresa.ts:35

***

### activa

> **activa**: `boolean`

Defined in: core/entities/Empresa.ts:36

***

### creadoPorUid

> `readonly` **creadoPorUid**: `string` \| `null`

Defined in: core/entities/Empresa.ts:37

***

### createdAt

> `readonly` **createdAt**: `Date`

Defined in: core/entities/Empresa.ts:38

***

### updatedAt

> **updatedAt**: `Date`

Defined in: core/entities/Empresa.ts:39

## Methods

### archivar()

> **archivar**(`ahora`): `void`

Defined in: core/entities/Empresa.ts:62

#### Parameters

##### ahora

`Date`

#### Returns

`void`

***

### restaurar()

> **restaurar**(`ahora`): `void`

Defined in: core/entities/Empresa.ts:66

#### Parameters

##### ahora

`Date`

#### Returns

`void`
