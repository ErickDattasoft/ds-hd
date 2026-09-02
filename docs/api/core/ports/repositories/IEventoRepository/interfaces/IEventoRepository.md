[**ds-hd**](../../../../../README.md)

***

[ds-hd](../../../../../README.md) / [core/ports/repositories/IEventoRepository](../README.md) / IEventoRepository

# Interface: IEventoRepository

Defined in: core/ports/repositories/IEventoRepository.ts:5

Persistencia de eventos/webinars (`eventos/{id}`).

## Methods

### findById()

> **findById**(`id`): `Promise`\<[`Evento`](../../../../entities/Evento/classes/Evento.md) \| `null`\>

Defined in: core/ports/repositories/IEventoRepository.ts:6

#### Parameters

##### id

`string`

#### Returns

`Promise`\<[`Evento`](../../../../entities/Evento/classes/Evento.md) \| `null`\>

***

### list()

> **list**(`soloPublicados?`): `Promise`\<[`Evento`](../../../../entities/Evento/classes/Evento.md)[]\>

Defined in: core/ports/repositories/IEventoRepository.ts:7

#### Parameters

##### soloPublicados?

`boolean`

#### Returns

`Promise`\<[`Evento`](../../../../entities/Evento/classes/Evento.md)[]\>

***

### proximos()

> **proximos**(`desde`, `hasta`): `Promise`\<[`Evento`](../../../../entities/Evento/classes/Evento.md)[]\>

Defined in: core/ports/repositories/IEventoRepository.ts:9

Eventos publicados cuya fecha cae dentro de la ventana [desde, hasta].

#### Parameters

##### desde

`Date`

##### hasta

`Date`

#### Returns

`Promise`\<[`Evento`](../../../../entities/Evento/classes/Evento.md)[]\>

***

### save()

> **save**(`evento`): `Promise`\<`void`\>

Defined in: core/ports/repositories/IEventoRepository.ts:10

#### Parameters

##### evento

[`Evento`](../../../../entities/Evento/classes/Evento.md)

#### Returns

`Promise`\<`void`\>
