[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [core/entities/ArticuloKB](../README.md) / ArticuloKB

# Class: ArticuloKB

Artículo de la base de conocimiento.

## Constructors

### Constructor

> **new ArticuloKB**(`props`): `ArticuloKB`

#### Parameters

##### props

[`ArticuloKBProps`](../interfaces/ArticuloKBProps.md)

#### Returns

`ArticuloKB`

## Properties

### id

> `readonly` **id**: `string`

***

### titulo

> **titulo**: `string`

***

### slug

> **slug**: `string`

***

### categoria

> **categoria**: `string` \| `null`

***

### cuerpoMarkdown

> **cuerpoMarkdown**: `string`

***

### tags

> **tags**: `string`[]

***

### publicado

> **publicado**: `boolean`

***

### visibilidad

> **visibilidad**: [`VisibilidadKB`](../type-aliases/VisibilidadKB.md)

***

### autorUid

> `readonly` **autorUid**: `string` \| `null`

***

### autorNombre

> **autorNombre**: `string` \| `null`

***

### createdAt

> `readonly` **createdAt**: `Date`

***

### updatedAt

> **updatedAt**: `Date`

## Methods

### visiblePara()

> **visiblePara**(`contexto`): `boolean`

¿Un usuario con este rol/área puede ver el artículo?

#### Parameters

##### contexto

###### esStaff

`boolean`

###### esCliente

`boolean`

###### anonimo

`boolean`

#### Returns

`boolean`
