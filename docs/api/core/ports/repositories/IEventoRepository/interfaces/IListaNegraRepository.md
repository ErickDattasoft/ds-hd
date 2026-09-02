[**ds-hd**](../../../../../README.md)

***

[ds-hd](../../../../../README.md) / [core/ports/repositories/IEventoRepository](../README.md) / IListaNegraRepository

# Interface: IListaNegraRepository

Defined in: core/ports/repositories/IEventoRepository.ts:25

Persistencia de la lista negra de correos bloqueados para registro a eventos.

## Methods

### contiene()

> **contiene**(`email`): `Promise`\<`boolean`\>

Defined in: core/ports/repositories/IEventoRepository.ts:26

#### Parameters

##### email

`string`

#### Returns

`Promise`\<`boolean`\>

***

### list()

> **list**(): `Promise`\<[`EntradaListaNegra`](../../../../entities/Inscripcion/interfaces/EntradaListaNegra.md)[]\>

Defined in: core/ports/repositories/IEventoRepository.ts:27

#### Returns

`Promise`\<[`EntradaListaNegra`](../../../../entities/Inscripcion/interfaces/EntradaListaNegra.md)[]\>

***

### agregar()

> **agregar**(`entrada`): `Promise`\<`void`\>

Defined in: core/ports/repositories/IEventoRepository.ts:28

#### Parameters

##### entrada

[`EntradaListaNegra`](../../../../entities/Inscripcion/interfaces/EntradaListaNegra.md)

#### Returns

`Promise`\<`void`\>

***

### quitar()

> **quitar**(`email`): `Promise`\<`void`\>

Defined in: core/ports/repositories/IEventoRepository.ts:29

#### Parameters

##### email

`string`

#### Returns

`Promise`\<`void`\>
