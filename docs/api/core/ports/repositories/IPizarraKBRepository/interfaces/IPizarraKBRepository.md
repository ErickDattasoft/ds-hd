[**ds-hd**](../../../../../README.md)

***

[ds-hd](../../../../../README.md) / [core/ports/repositories/IPizarraKBRepository](../README.md) / IPizarraKBRepository

# Interface: IPizarraKBRepository

Persistencia de la pizarra personal de cada usuario (`pizarras_kb/{uid}`).

## Methods

### obtener()

> **obtener**(`uid`): `Promise`\<[`PizarraKB`](../../../../entities/PizarraKB/interfaces/PizarraKB.md) \| `null`\>

#### Parameters

##### uid

`string`

#### Returns

`Promise`\<[`PizarraKB`](../../../../entities/PizarraKB/interfaces/PizarraKB.md) \| `null`\>

***

### guardar()

> **guardar**(`pizarra`): `Promise`\<`void`\>

#### Parameters

##### pizarra

[`PizarraKB`](../../../../entities/PizarraKB/interfaces/PizarraKB.md)

#### Returns

`Promise`\<`void`\>
