[**ds-hd**](../../../../../README.md)

***

[ds-hd](../../../../../README.md) / [core/ports/repositories/ITicketQueries](../README.md) / ITicketQueries

# Interface: ITicketQueries

Lado consulta (lectura) de tickets: listados, tablero y agregados.

## Methods

### listar()

> **listar**(`filtro`): `Promise`\<[`Ticket`](../../../../entities/Ticket/classes/Ticket.md)[]\>

#### Parameters

##### filtro

[`FiltroTickets`](FiltroTickets.md)

#### Returns

`Promise`\<[`Ticket`](../../../../entities/Ticket/classes/Ticket.md)[]\>

***

### contar()

> **contar**(`filtro`): `Promise`\<`number`\>

#### Parameters

##### filtro

[`FiltroTickets`](FiltroTickets.md)

#### Returns

`Promise`\<`number`\>

***

### tablero()

> **tablero**(`filtro`, `estados`): `Promise`\<[`ColumnaKanban`](ColumnaKanban.md)[]\>

#### Parameters

##### filtro

[`FiltroTickets`](FiltroTickets.md)

##### estados

readonly `string`[]

#### Returns

`Promise`\<[`ColumnaKanban`](ColumnaKanban.md)[]\>

***

### cargaPorAgente()

> **cargaPorAgente**(`agentes`, `ahora`): `Promise`\<[`CargaAgente`](CargaAgente.md)[]\>

#### Parameters

##### agentes

`object`[]

##### ahora

`Date`

#### Returns

`Promise`\<[`CargaAgente`](CargaAgente.md)[]\>
