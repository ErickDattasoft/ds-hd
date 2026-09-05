[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/tickets/TicketExcelService](../README.md) / TicketExcelService

# Class: TicketExcelService

Export de Tickets a Excel (`.xlsx`) — solo lectura, no hay import (paridad con el CRM viejo).

## Constructors

### Constructor

> **new TicketExcelService**(`queries`, `excel`): `TicketExcelService`

#### Parameters

##### queries

[`ITicketQueries`](../../../../core/ports/repositories/ITicketQueries/interfaces/ITicketQueries.md)

##### excel

[`IExcelIO`](../../../../core/ports/services/IExcelIO/interfaces/IExcelIO.md)

#### Returns

`TicketExcelService`

## Methods

### exportar()

> **exportar**(`filtro`): `Promise`\<`Buffer`\<`ArrayBufferLike`\>\>

#### Parameters

##### filtro

[`FiltroTickets`](../../../../core/ports/repositories/ITicketQueries/interfaces/FiltroTickets.md)

#### Returns

`Promise`\<`Buffer`\<`ArrayBufferLike`\>\>
