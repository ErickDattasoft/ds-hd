[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [core/entities/Cotizacion](../README.md) / Cotizacion

# Class: Cotizacion

Defined in: core/entities/Cotizacion.ts:44

Cotización comercial con folio consecutivo, conceptos e importes.

## Constructors

### Constructor

> **new Cotizacion**(`props`): `Cotizacion`

Defined in: core/entities/Cotizacion.ts:63

#### Parameters

##### props

[`CotizacionProps`](../interfaces/CotizacionProps.md)

#### Returns

`Cotizacion`

## Properties

### id

> `readonly` **id**: `string`

Defined in: core/entities/Cotizacion.ts:45

***

### folio

> `readonly` **folio**: `string`

Defined in: core/entities/Cotizacion.ts:46

***

### empresaId

> **empresaId**: `string`

Defined in: core/entities/Cotizacion.ts:47

***

### empresaNombre

> **empresaNombre**: `string` \| `null`

Defined in: core/entities/Cotizacion.ts:48

***

### contactoId

> **contactoId**: `string` \| `null`

Defined in: core/entities/Cotizacion.ts:49

***

### fecha

> **fecha**: `Date`

Defined in: core/entities/Cotizacion.ts:50

***

### vigenciaDias

> **vigenciaDias**: `number`

Defined in: core/entities/Cotizacion.ts:51

***

### estado

> **estado**: [`EstadoCotizacion`](../type-aliases/EstadoCotizacion.md)

Defined in: core/entities/Cotizacion.ts:52

***

### moneda

> **moneda**: `string`

Defined in: core/entities/Cotizacion.ts:53

***

### ivaTasa

> **ivaTasa**: `number`

Defined in: core/entities/Cotizacion.ts:54

***

### conceptos

> **conceptos**: [`ConceptoCotizacion`](../interfaces/ConceptoCotizacion.md)[]

Defined in: core/entities/Cotizacion.ts:55

***

### notas

> **notas**: `string` \| `null`

Defined in: core/entities/Cotizacion.ts:56

***

### origenCalculadora

> **origenCalculadora**: `boolean`

Defined in: core/entities/Cotizacion.ts:57

***

### parametrosCompac

> **parametrosCompac**: `Record`\<`string`, `unknown`\> \| `null`

Defined in: core/entities/Cotizacion.ts:58

***

### creadoPorUid

> `readonly` **creadoPorUid**: `string` \| `null`

Defined in: core/entities/Cotizacion.ts:59

***

### createdAt

> `readonly` **createdAt**: `Date`

Defined in: core/entities/Cotizacion.ts:60

***

### updatedAt

> **updatedAt**: `Date`

Defined in: core/entities/Cotizacion.ts:61

## Accessors

### subtotal

#### Get Signature

> **get** **subtotal**(): `number`

Defined in: core/entities/Cotizacion.ts:88

##### Returns

`number`

***

### iva

#### Get Signature

> **get** **iva**(): `number`

Defined in: core/entities/Cotizacion.ts:91

##### Returns

`number`

***

### total

#### Get Signature

> **get** **total**(): `number`

Defined in: core/entities/Cotizacion.ts:94

##### Returns

`number`

***

### venceEl

#### Get Signature

> **get** **venceEl**(): `Date`

Defined in: core/entities/Cotizacion.ts:97

##### Returns

`Date`

## Methods

### cambiarEstado()

> **cambiarEstado**(`nuevo`, `ahora`): `void`

Defined in: core/entities/Cotizacion.ts:101

#### Parameters

##### nuevo

[`EstadoCotizacion`](../type-aliases/EstadoCotizacion.md)

##### ahora

`Date`

#### Returns

`void`

***

### reemplazarConceptos()

> **reemplazarConceptos**(`conceptos`, `ahora`): `void`

Defined in: core/entities/Cotizacion.ts:110

#### Parameters

##### conceptos

[`ConceptoCotizacion`](../interfaces/ConceptoCotizacion.md)[]

##### ahora

`Date`

#### Returns

`void`
