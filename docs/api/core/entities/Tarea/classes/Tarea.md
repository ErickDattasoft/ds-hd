[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [core/entities/Tarea](../README.md) / Tarea

# Class: Tarea

Tarea de seguimiento comercial / interna, asignada a un usuario.

## Constructors

### Constructor

> **new Tarea**(`props`): `Tarea`

#### Parameters

##### props

[`TareaProps`](../interfaces/TareaProps.md)

#### Returns

`Tarea`

## Properties

### id

> `readonly` **id**: `string`

***

### titulo

> **titulo**: `string`

***

### descripcion

> **descripcion**: `string` \| `null`

***

### empresaId

> **empresaId**: `string` \| `null`

***

### contactoId

> **contactoId**: `string` \| `null`

***

### ticketId

> **ticketId**: `string` \| `null`

***

### asignadoAUid

> **asignadoAUid**: `string`

***

### asignadoANombre

> **asignadoANombre**: `string` \| `null`

***

### vence

> **vence**: `string` \| `null`

***

### completada

> **completada**: `boolean`

***

### completadaEn

> **completadaEn**: `Date` \| `null`

***

### creadoPorUid

> `readonly` **creadoPorUid**: `string` \| `null`

***

### createdAt

> `readonly` **createdAt**: `Date`

***

### updatedAt

> **updatedAt**: `Date`

## Accessors

### vencida

#### Get Signature

> **get** **vencida**(): `boolean`

##### Returns

`boolean`

***

### urgencia

#### Get Signature

> **get** **urgencia**(): `"vencida"` \| `"hoy"` \| `"proxima"` \| `null`

`null` si está completada o sin fecha; si no, qué tan urgente es su vencimiento.

##### Returns

`"vencida"` \| `"hoy"` \| `"proxima"` \| `null`

## Methods

### marcar()

> **marcar**(`completada`, `ahora`): `void`

#### Parameters

##### completada

`boolean`

##### ahora

`Date`

#### Returns

`void`
