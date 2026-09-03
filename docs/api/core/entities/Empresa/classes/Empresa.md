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

***

### sanearVigencias()

> `static` **sanearVigencias**(`vigencias`, `sistemasContratados`): `Record`\<`string`, `string`\>

Deja solo vigencias con fecha ISO válida y cuyo sistema sigue contratado.

#### Parameters

##### vigencias

`Record`\<`string`, `string`\> \| `undefined`

##### sistemasContratados

`string`[]

#### Returns

`Record`\<`string`, `string`\>

***

### estadoVigencia()

> **estadoVigencia**(`sistema`, `hoy`): [`EstadoVigencia`](../type-aliases/EstadoVigencia.md)

Estado de la licencia de un sistema contratado a la fecha `hoy`.

#### Parameters

##### sistema

`string`

##### hoy

`Date`

#### Returns

[`EstadoVigencia`](../type-aliases/EstadoVigencia.md)

***

### licenciasEnRiesgo()

> **licenciasEnRiesgo**(`hoy`): [`LicenciaSistema`](../interfaces/LicenciaSistema.md)[]

Sistemas contratados con licencia vencida o por vencer, ordenados por urgencia.

#### Parameters

##### hoy

`Date`

#### Returns

[`LicenciaSistema`](../interfaces/LicenciaSistema.md)[]
