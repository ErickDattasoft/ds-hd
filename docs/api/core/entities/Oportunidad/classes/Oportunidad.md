[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [core/entities/Oportunidad](../README.md) / Oportunidad

# Class: Oportunidad

Oportunidad de venta que avanza por las etapas del embudo.

## Constructors

### Constructor

> **new Oportunidad**(`p`): `Oportunidad`

#### Parameters

##### p

[`OportunidadProps`](../interfaces/OportunidadProps.md)

#### Returns

`Oportunidad`

## Properties

### id

> `readonly` **id**: `string`

***

### titulo

> **titulo**: `string`

***

### empresaId

> **empresaId**: `string` \| `null`

***

### empresaNombre

> **empresaNombre**: `string` \| `null`

***

### monto

> **monto**: `number`

***

### etapa

> **etapa**: `"contactado"` \| `"prospecto"` \| `"propuesta"` \| `"negociacion"` \| `"ganada"` \| `"perdida"`

***

### cierreEstimado

> **cierreEstimado**: `Date` \| `null`

***

### responsableUid

> **responsableUid**: `string` \| `null`

***

### responsableNombre

> **responsableNombre**: `string` \| `null`

***

### cotizacionId

> **cotizacionId**: `string` \| `null`

***

### notas

> **notas**: `string` \| `null`

***

### motivoPerdida

> **motivoPerdida**: `string` \| `null`

***

### createdAt

> `readonly` **createdAt**: `Date`

***

### updatedAt

> **updatedAt**: `Date`

## Accessors

### abierta

#### Get Signature

> **get** **abierta**(): `boolean`

##### Returns

`boolean`

## Methods

### moverA()

> **moverA**(`etapa`, `ahora`, `motivoPerdida?`): `void`

#### Parameters

##### etapa

`"contactado"` \| `"prospecto"` \| `"propuesta"` \| `"negociacion"` \| `"ganada"` \| `"perdida"`

##### ahora

`Date`

##### motivoPerdida?

`string`

#### Returns

`void`
