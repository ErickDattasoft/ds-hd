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

### eliminar()

> **eliminar**(`id`): `Promise`\<`void`\>

Borrado permanente, incluidas notas y eventos (solo desde la papelera).

#### Parameters

##### id

`string`

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

***

### guardarConDetalle()

> **guardarConDetalle**(`ticket`, `notas`, `eventos`): `Promise`\<`void`\>

Guarda el ticket con sus notas y eventos en UNA sola escritura.

Es para cargas masivas (importar el respaldo del CRM viejo): hacerlo documento a documento
son cientos de llamadas HTTP y la importación se corta al chocar con el tope de
subpeticiones del worker.

#### Parameters

##### ticket

[`Ticket`](../../../../entities/Ticket/classes/Ticket.md)

##### notas

[`NotaTicket`](../../../../entities/NotaTicket/interfaces/NotaTicket.md)[]

##### eventos

[`EventoTicket`](../../../../entities/NotaTicket/interfaces/EventoTicket.md)[]

#### Returns

`Promise`\<`void`\>

***

### guardarVariosConDetalle()

> **guardarVariosConDetalle**(`items`): `Promise`\<`void`\>

Muchos tickets con su detalle, en el menor número de escrituras posible.

#### Parameters

##### items

`object`[]

#### Returns

`Promise`\<`void`\>

***

### eliminarVarios()

> **eliminarVarios**(`ids`): `Promise`\<`void`\>

Borrado permanente de varios tickets (con sus notas y eventos), agrupando las llamadas.

#### Parameters

##### ids

`string`[]

#### Returns

`Promise`\<`void`\>
