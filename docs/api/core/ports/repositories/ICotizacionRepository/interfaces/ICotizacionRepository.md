[**ds-hd**](../../../../../README.md)

***

[ds-hd](../../../../../README.md) / [core/ports/repositories/ICotizacionRepository](../README.md) / ICotizacionRepository

# Interface: ICotizacionRepository

Defined in: core/ports/repositories/ICotizacionRepository.ts:12

Persistencia de cotizaciones (`cotizaciones/{id}`).

## Methods

### findById()

> **findById**(`id`): `Promise`\<[`Cotizacion`](../../../../entities/Cotizacion/classes/Cotizacion.md) \| `null`\>

Defined in: core/ports/repositories/ICotizacionRepository.ts:13

#### Parameters

##### id

`string`

#### Returns

`Promise`\<[`Cotizacion`](../../../../entities/Cotizacion/classes/Cotizacion.md) \| `null`\>

***

### list()

> **list**(`filtro?`): `Promise`\<[`Cotizacion`](../../../../entities/Cotizacion/classes/Cotizacion.md)[]\>

Defined in: core/ports/repositories/ICotizacionRepository.ts:14

#### Parameters

##### filtro?

[`ListarCotizacionesFiltro`](ListarCotizacionesFiltro.md)

#### Returns

`Promise`\<[`Cotizacion`](../../../../entities/Cotizacion/classes/Cotizacion.md)[]\>

***

### save()

> **save**(`cotizacion`): `Promise`\<`void`\>

Defined in: core/ports/repositories/ICotizacionRepository.ts:15

#### Parameters

##### cotizacion

[`Cotizacion`](../../../../entities/Cotizacion/classes/Cotizacion.md)

#### Returns

`Promise`\<`void`\>

***

### contarPorEstado()

> **contarPorEstado**(): `Promise`\<`Record`\<`string`, `number`\>\>

Defined in: core/ports/repositories/ICotizacionRepository.ts:16

#### Returns

`Promise`\<`Record`\<`string`, `number`\>\>
