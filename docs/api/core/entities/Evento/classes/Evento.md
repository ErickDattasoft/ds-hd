[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [core/entities/Evento](../README.md) / Evento

# Class: Evento

Evento / webinar con registro público.

## Constructors

### Constructor

> **new Evento**(`props`): `Evento`

#### Parameters

##### props

[`EventoProps`](../interfaces/EventoProps.md)

#### Returns

`Evento`

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

### fechaHora

> **fechaHora**: `Date`

***

### cupo

> **cupo**: `number`

***

### estado

> **estado**: [`EstadoEvento`](../type-aliases/EstadoEvento.md)

***

### urlWebinar

> **urlWebinar**: `string` \| `null`

***

### horasRecordatorio

> **horasRecordatorio**: `number`

***

### limiteRegistrosPorIp

> **limiteRegistrosPorIp**: `number` \| `null`

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

### abiertoARegistro

#### Get Signature

> **get** **abiertoARegistro**(): `boolean`

##### Returns

`boolean`

***

### sinCupo

#### Get Signature

> **get** **sinCupo**(): `boolean`

##### Returns

`boolean`

***

### limiteIpEfectivo

#### Get Signature

> **get** **limiteIpEfectivo**(): `number`

El tope de inscripciones por IP que aplica de verdad (el propio o el de por defecto).

##### Returns

`number`
