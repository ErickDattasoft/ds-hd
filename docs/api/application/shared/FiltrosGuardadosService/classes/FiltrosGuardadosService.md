[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/shared/FiltrosGuardadosService](../README.md) / FiltrosGuardadosService

# Class: FiltrosGuardadosService

Búsquedas frecuentes personales, reaplicables con un clic.

## Constructors

### Constructor

> **new FiltrosGuardadosService**(`repo`, `ids`, `clock`): `FiltrosGuardadosService`

#### Parameters

##### repo

[`IFiltroGuardadoRepository`](../../../../core/ports/repositories/IFiltroGuardadoRepository/interfaces/IFiltroGuardadoRepository.md)

##### ids

[`IIdGenerator`](../../../../core/ports/services/IIdGenerator/interfaces/IIdGenerator.md)

##### clock

[`IClock`](../../../../core/ports/services/IClock/interfaces/IClock.md)

#### Returns

`FiltrosGuardadosService`

## Methods

### listar()

> **listar**(`actor`, `modulo`): `Promise`\<[`FiltroGuardado`](../../../../core/entities/FiltroGuardado/interfaces/FiltroGuardado.md)[]\>

#### Parameters

##### actor

[`SessionUser`](../../SessionUser/interfaces/SessionUser.md)

##### modulo

`string`

#### Returns

`Promise`\<[`FiltroGuardado`](../../../../core/entities/FiltroGuardado/interfaces/FiltroGuardado.md)[]\>

***

### guardar()

> **guardar**(`actor`, `datos`): `Promise`\<[`FiltroGuardado`](../../../../core/entities/FiltroGuardado/interfaces/FiltroGuardado.md)\>

#### Parameters

##### actor

[`SessionUser`](../../SessionUser/interfaces/SessionUser.md)

##### datos

###### nombre

`string`

###### modulo

`string`

###### query

`string`

#### Returns

`Promise`\<[`FiltroGuardado`](../../../../core/entities/FiltroGuardado/interfaces/FiltroGuardado.md)\>

***

### eliminar()

> **eliminar**(`actor`, `id`): `Promise`\<`void`\>

#### Parameters

##### actor

[`SessionUser`](../../SessionUser/interfaces/SessionUser.md)

##### id

`string`

#### Returns

`Promise`\<`void`\>
