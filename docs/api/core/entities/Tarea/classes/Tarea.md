[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [core/entities/Tarea](../README.md) / Tarea

# Class: Tarea

Defined in: core/entities/Tarea.ts:22

Tarea de seguimiento comercial / interna, asignada a un usuario.

## Constructors

### Constructor

> **new Tarea**(`props`): `Tarea`

Defined in: core/entities/Tarea.ts:38

#### Parameters

##### props

[`TareaProps`](../interfaces/TareaProps.md)

#### Returns

`Tarea`

## Properties

### id

> `readonly` **id**: `string`

Defined in: core/entities/Tarea.ts:23

***

### titulo

> **titulo**: `string`

Defined in: core/entities/Tarea.ts:24

***

### descripcion

> **descripcion**: `string` \| `null`

Defined in: core/entities/Tarea.ts:25

***

### empresaId

> **empresaId**: `string` \| `null`

Defined in: core/entities/Tarea.ts:26

***

### contactoId

> **contactoId**: `string` \| `null`

Defined in: core/entities/Tarea.ts:27

***

### ticketId

> **ticketId**: `string` \| `null`

Defined in: core/entities/Tarea.ts:28

***

### asignadoAUid

> **asignadoAUid**: `string`

Defined in: core/entities/Tarea.ts:29

***

### asignadoANombre

> **asignadoANombre**: `string` \| `null`

Defined in: core/entities/Tarea.ts:30

***

### vence

> **vence**: `string` \| `null`

Defined in: core/entities/Tarea.ts:31

***

### completada

> **completada**: `boolean`

Defined in: core/entities/Tarea.ts:32

***

### completadaEn

> **completadaEn**: `Date` \| `null`

Defined in: core/entities/Tarea.ts:33

***

### creadoPorUid

> `readonly` **creadoPorUid**: `string` \| `null`

Defined in: core/entities/Tarea.ts:34

***

### createdAt

> `readonly` **createdAt**: `Date`

Defined in: core/entities/Tarea.ts:35

***

### updatedAt

> **updatedAt**: `Date`

Defined in: core/entities/Tarea.ts:36

## Accessors

### vencida

#### Get Signature

> **get** **vencida**(): `boolean`

Defined in: core/entities/Tarea.ts:67

##### Returns

`boolean`

## Methods

### marcar()

> **marcar**(`completada`, `ahora`): `void`

Defined in: core/entities/Tarea.ts:61

#### Parameters

##### completada

`boolean`

##### ahora

`Date`

#### Returns

`void`
