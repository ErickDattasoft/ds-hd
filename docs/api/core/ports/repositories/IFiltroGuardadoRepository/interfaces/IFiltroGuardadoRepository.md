[**ds-hd**](../../../../../README.md)

***

[ds-hd](../../../../../README.md) / [core/ports/repositories/IFiltroGuardadoRepository](../README.md) / IFiltroGuardadoRepository

# Interface: IFiltroGuardadoRepository

Persistencia de filtros guardados por usuario (`filtros_guardados/{id}`).

## Methods

### findById()

> **findById**(`id`): `Promise`\<[`FiltroGuardado`](../../../../entities/FiltroGuardado/interfaces/FiltroGuardado.md) \| `null`\>

#### Parameters

##### id

`string`

#### Returns

`Promise`\<[`FiltroGuardado`](../../../../entities/FiltroGuardado/interfaces/FiltroGuardado.md) \| `null`\>

***

### listar()

> **listar**(`uid`, `modulo?`): `Promise`\<[`FiltroGuardado`](../../../../entities/FiltroGuardado/interfaces/FiltroGuardado.md)[]\>

Filtros de un usuario, opcionalmente acotados a un módulo, más nuevos primero.

#### Parameters

##### uid

`string`

##### modulo?

`string`

#### Returns

`Promise`\<[`FiltroGuardado`](../../../../entities/FiltroGuardado/interfaces/FiltroGuardado.md)[]\>

***

### guardar()

> **guardar**(`filtro`): `Promise`\<`void`\>

#### Parameters

##### filtro

[`FiltroGuardado`](../../../../entities/FiltroGuardado/interfaces/FiltroGuardado.md)

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
