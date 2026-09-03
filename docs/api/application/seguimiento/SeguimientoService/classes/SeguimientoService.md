[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/seguimiento/SeguimientoService](../README.md) / SeguimientoService

# Class: SeguimientoService

Seguimiento comercial: interacciones (log) y tareas (asignables, con vencimiento).

## Constructors

### Constructor

> **new SeguimientoService**(`interacciones`, `tareas`, `ids`, `clock`, `bitacora`): `SeguimientoService`

#### Parameters

##### interacciones

[`IInteraccionRepository`](../../../../core/ports/repositories/ISeguimientoRepository/interfaces/IInteraccionRepository.md)

##### tareas

[`ITareaRepository`](../../../../core/ports/repositories/ISeguimientoRepository/interfaces/ITareaRepository.md)

##### ids

[`IIdGenerator`](../../../../core/ports/services/IIdGenerator/interfaces/IIdGenerator.md)

##### clock

[`IClock`](../../../../core/ports/services/IClock/interfaces/IClock.md)

##### bitacora

[`BitacoraService`](../../../shared/BitacoraService/classes/BitacoraService.md)

#### Returns

`SeguimientoService`

## Methods

### interaccionesDe()

> **interaccionesDe**(`empresaId`): `Promise`\<[`Interaccion`](../../../../core/entities/Interaccion/classes/Interaccion.md)[]\>

#### Parameters

##### empresaId

`string`

#### Returns

`Promise`\<[`Interaccion`](../../../../core/entities/Interaccion/classes/Interaccion.md)[]\>

***

### registrarInteraccion()

> **registrarInteraccion**(`input`): `Promise`\<`void`\>

#### Parameters

##### input

###### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

###### empresaId

`string`

###### contactoId?

`string`

###### tipo

[`TipoInteraccion`](../../../../core/entities/Interaccion/type-aliases/TipoInteraccion.md)

###### fecha

`string`

###### resumen

`string`

#### Returns

`Promise`\<`void`\>

***

### listarTareas()

> **listarTareas**(`filtro?`): `Promise`\<[`Tarea`](../../../../core/entities/Tarea/classes/Tarea.md)[]\>

#### Parameters

##### filtro?

[`ListarTareasFiltro`](../../../../core/ports/repositories/ISeguimientoRepository/interfaces/ListarTareasFiltro.md)

#### Returns

`Promise`\<[`Tarea`](../../../../core/entities/Tarea/classes/Tarea.md)[]\>

***

### crearTarea()

> **crearTarea**(`input`): `Promise`\<[`Tarea`](../../../../core/entities/Tarea/classes/Tarea.md)\>

#### Parameters

##### input

###### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

###### titulo

`string`

###### descripcion?

`string`

###### empresaId?

`string`

###### ticketId?

`string`

###### asignadoAUid

`string`

###### asignadoANombre?

`string`

###### vence?

`string`

#### Returns

`Promise`\<[`Tarea`](../../../../core/entities/Tarea/classes/Tarea.md)\>

***

### marcarTarea()

> **marcarTarea**(`actor`, `id`, `completada`): `Promise`\<`void`\>

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### id

`string`

##### completada

`boolean`

#### Returns

`Promise`\<`void`\>
