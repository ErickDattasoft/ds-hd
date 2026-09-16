[**ds-hd**](../../../../../README.md)

***

[ds-hd](../../../../../README.md) / [core/ports/repositories/IBusquedaKBRepository](../README.md) / IBusquedaKBRepository

# Interface: IBusquedaKBRepository

Persistencia del historial de búsquedas de KB por usuario (`busquedas_kb/{id}`).

## Methods

### listar()

> **listar**(`uid`): `Promise`\<[`BusquedaKB`](../../../../entities/BusquedaKB/interfaces/BusquedaKB.md)[]\>

Búsquedas de un usuario, más recientes primero.

#### Parameters

##### uid

`string`

#### Returns

`Promise`\<[`BusquedaKB`](../../../../entities/BusquedaKB/interfaces/BusquedaKB.md)[]\>

***

### guardar()

> **guardar**(`busqueda`): `Promise`\<`void`\>

#### Parameters

##### busqueda

[`BusquedaKB`](../../../../entities/BusquedaKB/interfaces/BusquedaKB.md)

#### Returns

`Promise`\<`void`\>

***

### eliminar()

> **eliminar**(`id`): `Promise`\<`void`\>

#### Parameters

##### id

`string`

#### Returns

`Promise`\<`void`\>

***

### limpiar()

> **limpiar**(`uid`): `Promise`\<`void`\>

Borra todo el historial de un usuario.

#### Parameters

##### uid

`string`

#### Returns

`Promise`\<`void`\>
