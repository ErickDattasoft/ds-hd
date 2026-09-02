[**ds-hd**](../../../../../README.md)

***

[ds-hd](../../../../../README.md) / [core/ports/repositories/ISeguimientoRepository](../README.md) / ITareaRepository

# Interface: ITareaRepository

Defined in: core/ports/repositories/ISeguimientoRepository.ts:19

Persistencia de tareas de seguimiento (`tareas/{id}`).

## Methods

### findById()

> **findById**(`id`): `Promise`\<[`Tarea`](../../../../entities/Tarea/classes/Tarea.md) \| `null`\>

Defined in: core/ports/repositories/ISeguimientoRepository.ts:20

#### Parameters

##### id

`string`

#### Returns

`Promise`\<[`Tarea`](../../../../entities/Tarea/classes/Tarea.md) \| `null`\>

***

### list()

> **list**(`filtro?`): `Promise`\<[`Tarea`](../../../../entities/Tarea/classes/Tarea.md)[]\>

Defined in: core/ports/repositories/ISeguimientoRepository.ts:21

#### Parameters

##### filtro?

[`ListarTareasFiltro`](ListarTareasFiltro.md)

#### Returns

`Promise`\<[`Tarea`](../../../../entities/Tarea/classes/Tarea.md)[]\>

***

### save()

> **save**(`tarea`): `Promise`\<`void`\>

Defined in: core/ports/repositories/ISeguimientoRepository.ts:22

#### Parameters

##### tarea

[`Tarea`](../../../../entities/Tarea/classes/Tarea.md)

#### Returns

`Promise`\<`void`\>
