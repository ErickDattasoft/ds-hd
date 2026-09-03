[**ds-hd**](../../../../../README.md)

***

[ds-hd](../../../../../README.md) / [core/ports/repositories/ITicketPublicoRepository](../README.md) / ITicketPublicoRepository

# Interface: ITicketPublicoRepository

Buzón de tickets entrantes del portal público (`tickets_publicos`).

## Methods

### create()

> **create**(`data`): `Promise`\<[`TicketPublico`](../../../../entities/TicketPublico/interfaces/TicketPublico.md)\>

#### Parameters

##### data

`Omit`\<[`TicketPublico`](../../../../entities/TicketPublico/interfaces/TicketPublico.md), `"id"` \| `"estado"` \| `"ticketNumero"` \| `"createdAt"`\>

#### Returns

`Promise`\<[`TicketPublico`](../../../../entities/TicketPublico/interfaces/TicketPublico.md)\>

***

### findById()

> **findById**(`id`): `Promise`\<[`TicketPublico`](../../../../entities/TicketPublico/interfaces/TicketPublico.md) \| `null`\>

#### Parameters

##### id

`string`

#### Returns

`Promise`\<[`TicketPublico`](../../../../entities/TicketPublico/interfaces/TicketPublico.md) \| `null`\>

***

### listPendientes()

> **listPendientes**(): `Promise`\<[`TicketPublico`](../../../../entities/TicketPublico/interfaces/TicketPublico.md)[]\>

#### Returns

`Promise`\<[`TicketPublico`](../../../../entities/TicketPublico/interfaces/TicketPublico.md)[]\>

***

### marcarAceptado()

> **marcarAceptado**(`id`, `ticketNumero`): `Promise`\<`void`\>

#### Parameters

##### id

`string`

##### ticketNumero

`number`

#### Returns

`Promise`\<`void`\>

***

### marcarRechazado()

> **marcarRechazado**(`id`): `Promise`\<`void`\>

#### Parameters

##### id

`string`

#### Returns

`Promise`\<`void`\>
