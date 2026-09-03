[**ds-hd**](../../../../../README.md)

***

[ds-hd](../../../../../README.md) / [core/ports/repositories/ISeguimientoRepository](../README.md) / IInteraccionRepository

# Interface: IInteraccionRepository

Persistencia del seguimiento comercial: interacciones (`interacciones/{id}`) y tareas (`tareas/{id}`).

## Methods

### create()

> **create**(`interaccion`): `Promise`\<`void`\>

#### Parameters

##### interaccion

[`Interaccion`](../../../../entities/Interaccion/classes/Interaccion.md)

#### Returns

`Promise`\<`void`\>

***

### listPorEmpresa()

> **listPorEmpresa**(`empresaId`): `Promise`\<[`Interaccion`](../../../../entities/Interaccion/classes/Interaccion.md)[]\>

#### Parameters

##### empresaId

`string`

#### Returns

`Promise`\<[`Interaccion`](../../../../entities/Interaccion/classes/Interaccion.md)[]\>

***

### listRecientes()

> **listRecientes**(`limite`): `Promise`\<[`Interaccion`](../../../../entities/Interaccion/classes/Interaccion.md)[]\>

#### Parameters

##### limite

`number`

#### Returns

`Promise`\<[`Interaccion`](../../../../entities/Interaccion/classes/Interaccion.md)[]\>
