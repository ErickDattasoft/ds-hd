[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/knowledge/HistorialBusquedaKBService](../README.md) / HistorialBusquedaKBService

# Class: HistorialBusquedaKBService

Historial personal de búsquedas en la base de conocimiento (para volver a aplicarlas).

## Constructors

### Constructor

> **new HistorialBusquedaKBService**(`repo`, `ids`, `clock`): `HistorialBusquedaKBService`

#### Parameters

##### repo

[`IBusquedaKBRepository`](../../../../core/ports/repositories/IBusquedaKBRepository/interfaces/IBusquedaKBRepository.md)

##### ids

[`IIdGenerator`](../../../../core/ports/services/IIdGenerator/interfaces/IIdGenerator.md)

##### clock

[`IClock`](../../../../core/ports/services/IClock/interfaces/IClock.md)

#### Returns

`HistorialBusquedaKBService`

## Methods

### listar()

> **listar**(`actor`): `Promise`\<[`BusquedaKB`](../../../../core/entities/BusquedaKB/interfaces/BusquedaKB.md)[]\>

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

#### Returns

`Promise`\<[`BusquedaKB`](../../../../core/entities/BusquedaKB/interfaces/BusquedaKB.md)[]\>

***

### registrar()

> **registrar**(`actor`, `texto`): `Promise`\<`void`\>

Registra una búsqueda, salvo que repita la más reciente. Recorta al máximo permitido.

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### texto

`string`

#### Returns

`Promise`\<`void`\>

***

### limpiar()

> **limpiar**(`actor`): `Promise`\<`void`\>

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

#### Returns

`Promise`\<`void`\>
