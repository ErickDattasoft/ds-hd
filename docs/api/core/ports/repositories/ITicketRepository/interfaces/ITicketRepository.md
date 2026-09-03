[**ds-hd**](../../../../../README.md)

***

[ds-hd](../../../../../README.md) / [core/ports/repositories/ITicketRepository](../README.md) / ITicketRepository

# Interface: ITicketRepository

Persistencia (lado comando) de tickets: `tickets/{id}` + subcolecciones `notas` y `eventos`.
Las consultas de listado/tablero viven en `ITicketQueries` (ISP).

Semántica compartida por la impl Firestore y los fakes (LSP): `findById` → `null` si no
existe; `save` hace upsert por `id`.

## Methods

### findById()

> **findById**(`id`): `Promise`\<[`Ticket`](../../../../entities/Ticket/classes/Ticket.md) \| `null`\>

#### Parameters

##### id

`string`

#### Returns

`Promise`\<[`Ticket`](../../../../entities/Ticket/classes/Ticket.md) \| `null`\>

***

### findByNumero()

> **findByNumero**(`numero`): `Promise`\<[`Ticket`](../../../../entities/Ticket/classes/Ticket.md) \| `null`\>

#### Parameters

##### numero

`number`

#### Returns

`Promise`\<[`Ticket`](../../../../entities/Ticket/classes/Ticket.md) \| `null`\>

***

### save()

> **save**(`ticket`): `Promise`\<`void`\>

#### Parameters

##### ticket

[`Ticket`](../../../../entities/Ticket/classes/Ticket.md)

#### Returns

`Promise`\<`void`\>

***

### agregarNota()

> **agregarNota**(`ticketId`, `nota`): `Promise`\<`void`\>

#### Parameters

##### ticketId

`string`

##### nota

[`NotaTicket`](../../../../entities/NotaTicket/interfaces/NotaTicket.md)

#### Returns

`Promise`\<`void`\>

***

### listarNotas()

> **listarNotas**(`ticketId`): `Promise`\<[`NotaTicket`](../../../../entities/NotaTicket/interfaces/NotaTicket.md)[]\>

#### Parameters

##### ticketId

`string`

#### Returns

`Promise`\<[`NotaTicket`](../../../../entities/NotaTicket/interfaces/NotaTicket.md)[]\>

***

### registrarEvento()

> **registrarEvento**(`ticketId`, `evento`): `Promise`\<`void`\>

#### Parameters

##### ticketId

`string`

##### evento

[`EventoTicket`](../../../../entities/NotaTicket/interfaces/EventoTicket.md)

#### Returns

`Promise`\<`void`\>

***

### listarEventos()

> **listarEventos**(`ticketId`): `Promise`\<[`EventoTicket`](../../../../entities/NotaTicket/interfaces/EventoTicket.md)[]\>

#### Parameters

##### ticketId

`string`

#### Returns

`Promise`\<[`EventoTicket`](../../../../entities/NotaTicket/interfaces/EventoTicket.md)[]\>
