[**ds-hd**](../../../../../README.md)

***

[ds-hd](../../../../../README.md) / [core/ports/repositories/ITicketPublicoRepository](../README.md) / ITicketPublicoRepository

# Interface: ITicketPublicoRepository

Defined in: core/ports/repositories/ITicketPublicoRepository.ts:4

Buzón de tickets entrantes del portal público (`tickets_publicos`).

## Methods

### create()

> **create**(`data`): `Promise`\<[`TicketPublico`](../../../../entities/TicketPublico/interfaces/TicketPublico.md)\>

Defined in: core/ports/repositories/ITicketPublicoRepository.ts:5

#### Parameters

##### data

`Omit`\<[`TicketPublico`](../../../../entities/TicketPublico/interfaces/TicketPublico.md), `"id"` \| `"estado"` \| `"ticketNumero"` \| `"createdAt"`\>

#### Returns

`Promise`\<[`TicketPublico`](../../../../entities/TicketPublico/interfaces/TicketPublico.md)\>

***

### findById()

> **findById**(`id`): `Promise`\<[`TicketPublico`](../../../../entities/TicketPublico/interfaces/TicketPublico.md) \| `null`\>

Defined in: core/ports/repositories/ITicketPublicoRepository.ts:6

#### Parameters

##### id

`string`

#### Returns

`Promise`\<[`TicketPublico`](../../../../entities/TicketPublico/interfaces/TicketPublico.md) \| `null`\>

***

### listPendientes()

> **listPendientes**(): `Promise`\<[`TicketPublico`](../../../../entities/TicketPublico/interfaces/TicketPublico.md)[]\>

Defined in: core/ports/repositories/ITicketPublicoRepository.ts:7

#### Returns

`Promise`\<[`TicketPublico`](../../../../entities/TicketPublico/interfaces/TicketPublico.md)[]\>

***

### marcarAceptado()

> **marcarAceptado**(`id`, `ticketNumero`): `Promise`\<`void`\>

Defined in: core/ports/repositories/ITicketPublicoRepository.ts:8

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

Defined in: core/ports/repositories/ITicketPublicoRepository.ts:9

#### Parameters

##### id

`string`

#### Returns

`Promise`\<`void`\>
