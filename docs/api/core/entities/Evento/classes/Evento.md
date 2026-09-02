[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [core/entities/Evento](../README.md) / Evento

# Class: Evento

Defined in: core/entities/Evento.ts:22

Evento / webinar con registro público.

## Constructors

### Constructor

> **new Evento**(`props`): `Evento`

Defined in: core/entities/Evento.ts:35

#### Parameters

##### props

[`EventoProps`](../interfaces/EventoProps.md)

#### Returns

`Evento`

## Properties

### id

> `readonly` **id**: `string`

Defined in: core/entities/Evento.ts:23

***

### titulo

> **titulo**: `string`

Defined in: core/entities/Evento.ts:24

***

### descripcion

> **descripcion**: `string` \| `null`

Defined in: core/entities/Evento.ts:25

***

### fechaHora

> **fechaHora**: `Date`

Defined in: core/entities/Evento.ts:26

***

### cupo

> **cupo**: `number`

Defined in: core/entities/Evento.ts:27

***

### estado

> **estado**: [`EstadoEvento`](../type-aliases/EstadoEvento.md)

Defined in: core/entities/Evento.ts:28

***

### urlWebinar

> **urlWebinar**: `string` \| `null`

Defined in: core/entities/Evento.ts:29

***

### horasRecordatorio

> **horasRecordatorio**: `number`

Defined in: core/entities/Evento.ts:30

***

### creadoPorUid

> `readonly` **creadoPorUid**: `string` \| `null`

Defined in: core/entities/Evento.ts:31

***

### createdAt

> `readonly` **createdAt**: `Date`

Defined in: core/entities/Evento.ts:32

***

### updatedAt

> **updatedAt**: `Date`

Defined in: core/entities/Evento.ts:33

## Accessors

### abiertoARegistro

#### Get Signature

> **get** **abiertoARegistro**(): `boolean`

Defined in: core/entities/Evento.ts:52

##### Returns

`boolean`

***

### sinCupo

#### Get Signature

> **get** **sinCupo**(): `boolean`

Defined in: core/entities/Evento.ts:56

##### Returns

`boolean`
