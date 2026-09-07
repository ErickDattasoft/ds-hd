[**ds-hd**](../../../../../README.md)

***

[ds-hd](../../../../../README.md) / [core/ports/repositories/IEventoRepository](../README.md) / IEventoRepository

# Interface: IEventoRepository

Persistencia de eventos/webinars (`eventos/{id}`).

## Methods

### findById()

> **findById**(`id`): `Promise`\<[`Evento`](../../../../entities/Evento/classes/Evento.md) \| `null`\>

#### Parameters

##### id

`string`

#### Returns

`Promise`\<[`Evento`](../../../../entities/Evento/classes/Evento.md) \| `null`\>

***

### list()

> **list**(`soloPublicados?`): `Promise`\<[`Evento`](../../../../entities/Evento/classes/Evento.md)[]\>

#### Parameters

##### soloPublicados?

`boolean`

#### Returns

`Promise`\<[`Evento`](../../../../entities/Evento/classes/Evento.md)[]\>

***

### proximos()

> **proximos**(`desde`, `hasta`): `Promise`\<[`Evento`](../../../../entities/Evento/classes/Evento.md)[]\>

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

#### Parameters

##### evento

[`Evento`](../../../../entities/Evento/classes/Evento.md)

#### Returns

`Promise`\<`void`\>

***

### eliminar()

> **eliminar**(`id`): `Promise`\<`void`\>

Borrado permanente del evento (sus inscripciones se borran aparte).

#### Parameters

##### id

`string`

#### Returns

`Promise`\<`void`\>
