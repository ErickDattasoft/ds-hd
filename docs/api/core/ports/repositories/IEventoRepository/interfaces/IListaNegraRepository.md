[**ds-hd**](../../../../../README.md)

***

[ds-hd](../../../../../README.md) / [core/ports/repositories/IEventoRepository](../README.md) / IListaNegraRepository

# Interface: IListaNegraRepository

Persistencia de la lista negra de correos bloqueados para registro a eventos.

## Methods

### contiene()

> **contiene**(`email`): `Promise`\<`boolean`\>

#### Parameters

##### email

`string`

#### Returns

`Promise`\<`boolean`\>

***

### list()

> **list**(): `Promise`\<[`EntradaListaNegra`](../../../../entities/Inscripcion/interfaces/EntradaListaNegra.md)[]\>

#### Returns

`Promise`\<[`EntradaListaNegra`](../../../../entities/Inscripcion/interfaces/EntradaListaNegra.md)[]\>

***

### agregar()

> **agregar**(`entrada`): `Promise`\<`void`\>

#### Parameters

##### entrada

[`EntradaListaNegra`](../../../../entities/Inscripcion/interfaces/EntradaListaNegra.md)

#### Returns

`Promise`\<`void`\>

***

### quitar()

> **quitar**(`email`): `Promise`\<`void`\>

#### Parameters

##### email

`string`

#### Returns

`Promise`\<`void`\>
