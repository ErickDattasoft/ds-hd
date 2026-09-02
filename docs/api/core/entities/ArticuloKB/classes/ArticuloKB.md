[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [core/entities/ArticuloKB](../README.md) / ArticuloKB

# Class: ArticuloKB

Defined in: core/entities/ArticuloKB.ts:33

Artículo de la base de conocimiento.

## Constructors

### Constructor

> **new ArticuloKB**(`props`): `ArticuloKB`

Defined in: core/entities/ArticuloKB.ts:47

#### Parameters

##### props

[`ArticuloKBProps`](../interfaces/ArticuloKBProps.md)

#### Returns

`ArticuloKB`

## Properties

### id

> `readonly` **id**: `string`

Defined in: core/entities/ArticuloKB.ts:34

***

### titulo

> **titulo**: `string`

Defined in: core/entities/ArticuloKB.ts:35

***

### slug

> **slug**: `string`

Defined in: core/entities/ArticuloKB.ts:36

***

### categoria

> **categoria**: `string` \| `null`

Defined in: core/entities/ArticuloKB.ts:37

***

### cuerpoMarkdown

> **cuerpoMarkdown**: `string`

Defined in: core/entities/ArticuloKB.ts:38

***

### tags

> **tags**: `string`[]

Defined in: core/entities/ArticuloKB.ts:39

***

### publicado

> **publicado**: `boolean`

Defined in: core/entities/ArticuloKB.ts:40

***

### visibilidad

> **visibilidad**: [`VisibilidadKB`](../type-aliases/VisibilidadKB.md)

Defined in: core/entities/ArticuloKB.ts:41

***

### autorUid

> `readonly` **autorUid**: `string` \| `null`

Defined in: core/entities/ArticuloKB.ts:42

***

### autorNombre

> **autorNombre**: `string` \| `null`

Defined in: core/entities/ArticuloKB.ts:43

***

### createdAt

> `readonly` **createdAt**: `Date`

Defined in: core/entities/ArticuloKB.ts:44

***

### updatedAt

> **updatedAt**: `Date`

Defined in: core/entities/ArticuloKB.ts:45

## Methods

### visiblePara()

> **visiblePara**(`contexto`): `boolean`

Defined in: core/entities/ArticuloKB.ts:69

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
