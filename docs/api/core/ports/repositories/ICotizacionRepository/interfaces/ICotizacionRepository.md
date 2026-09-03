[**ds-hd**](../../../../../README.md)

***

[ds-hd](../../../../../README.md) / [core/ports/repositories/ICotizacionRepository](../README.md) / ICotizacionRepository

# Interface: ICotizacionRepository

Persistencia de cotizaciones (`cotizaciones/{id}`).

## Methods

### findById()

> **findById**(`id`): `Promise`\<[`Cotizacion`](../../../../entities/Cotizacion/classes/Cotizacion.md) \| `null`\>

#### Parameters

##### id

`string`

#### Returns

`Promise`\<[`Cotizacion`](../../../../entities/Cotizacion/classes/Cotizacion.md) \| `null`\>

***

### list()

> **list**(`filtro?`): `Promise`\<[`Cotizacion`](../../../../entities/Cotizacion/classes/Cotizacion.md)[]\>

#### Parameters

##### filtro?

[`ListarCotizacionesFiltro`](ListarCotizacionesFiltro.md)

#### Returns

`Promise`\<[`Cotizacion`](../../../../entities/Cotizacion/classes/Cotizacion.md)[]\>

***

### save()

> **save**(`cotizacion`): `Promise`\<`void`\>

#### Parameters

##### cotizacion

[`Cotizacion`](../../../../entities/Cotizacion/classes/Cotizacion.md)

#### Returns

`Promise`\<`void`\>

***

### contarPorEstado()

> **contarPorEstado**(): `Promise`\<`Record`\<`string`, `number`\>\>

#### Returns

`Promise`\<`Record`\<`string`, `number`\>\>
