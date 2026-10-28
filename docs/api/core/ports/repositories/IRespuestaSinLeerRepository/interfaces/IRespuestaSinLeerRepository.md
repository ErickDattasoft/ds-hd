[**ds-hd**](../../../../../README.md)

***

[ds-hd](../../../../../README.md) / [core/ports/repositories/IRespuestaSinLeerRepository](../README.md) / IRespuestaSinLeerRepository

# Interface: IRespuestaSinLeerRepository

Persistencia del buzón de respuestas de clientes sin leer (`respuestas_sin_leer/{ticketId}`).

## Methods

### guardar()

> **guardar**(`r`): `Promise`\<`void`\>

Upsert por `ticketId`: la respuesta más reciente reemplaza a la anterior.

#### Parameters

##### r

[`RespuestaSinLeer`](../../../../entities/RespuestaSinLeer/interfaces/RespuestaSinLeer.md)

#### Returns

`Promise`\<`void`\>

***

### listar()

> **listar**(): `Promise`\<[`RespuestaSinLeer`](../../../../entities/RespuestaSinLeer/interfaces/RespuestaSinLeer.md)[]\>

Todas, sin orden garantizado.

#### Returns

`Promise`\<[`RespuestaSinLeer`](../../../../entities/RespuestaSinLeer/interfaces/RespuestaSinLeer.md)[]\>

***

### quitar()

> **quitar**(`ticketId`): `Promise`\<`boolean`\>

`true` si había una y se borró.

#### Parameters

##### ticketId

`string`

#### Returns

`Promise`\<`boolean`\>
