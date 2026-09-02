[**ds-hd**](../../../../../README.md)

***

[ds-hd](../../../../../README.md) / [core/ports/repositories/ISeguimientoRepository](../README.md) / IInteraccionRepository

# Interface: IInteraccionRepository

Defined in: core/ports/repositories/ISeguimientoRepository.ts:5

Persistencia del seguimiento comercial: interacciones (`interacciones/{id}`) y tareas (`tareas/{id}`).

## Methods

### create()

> **create**(`interaccion`): `Promise`\<`void`\>

Defined in: core/ports/repositories/ISeguimientoRepository.ts:6

#### Parameters

##### interaccion

[`Interaccion`](../../../../entities/Interaccion/classes/Interaccion.md)

#### Returns

`Promise`\<`void`\>

***

### listPorEmpresa()

> **listPorEmpresa**(`empresaId`): `Promise`\<[`Interaccion`](../../../../entities/Interaccion/classes/Interaccion.md)[]\>

Defined in: core/ports/repositories/ISeguimientoRepository.ts:7

#### Parameters

##### empresaId

`string`

#### Returns

`Promise`\<[`Interaccion`](../../../../entities/Interaccion/classes/Interaccion.md)[]\>

***

### listRecientes()

> **listRecientes**(`limite`): `Promise`\<[`Interaccion`](../../../../entities/Interaccion/classes/Interaccion.md)[]\>

Defined in: core/ports/repositories/ISeguimientoRepository.ts:8

#### Parameters

##### limite

`number`

#### Returns

`Promise`\<[`Interaccion`](../../../../entities/Interaccion/classes/Interaccion.md)[]\>
