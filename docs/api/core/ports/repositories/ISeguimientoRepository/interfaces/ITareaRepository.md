[**ds-hd**](../../../../../README.md)

***

[ds-hd](../../../../../README.md) / [core/ports/repositories/ISeguimientoRepository](../README.md) / ITareaRepository

# Interface: ITareaRepository

Persistencia de tareas de seguimiento (`tareas/{id}`).

## Methods

### findById()

> **findById**(`id`): `Promise`\<[`Tarea`](../../../../entities/Tarea/classes/Tarea.md) \| `null`\>

#### Parameters

##### id

`string`

#### Returns

`Promise`\<[`Tarea`](../../../../entities/Tarea/classes/Tarea.md) \| `null`\>

***

### list()

> **list**(`filtro?`): `Promise`\<[`Tarea`](../../../../entities/Tarea/classes/Tarea.md)[]\>

#### Parameters

##### filtro?

[`ListarTareasFiltro`](ListarTareasFiltro.md)

#### Returns

`Promise`\<[`Tarea`](../../../../entities/Tarea/classes/Tarea.md)[]\>

***

### save()

> **save**(`tarea`): `Promise`\<`void`\>

#### Parameters

##### tarea

[`Tarea`](../../../../entities/Tarea/classes/Tarea.md)

#### Returns

`Promise`\<`void`\>
