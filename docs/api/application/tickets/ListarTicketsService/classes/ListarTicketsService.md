[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/tickets/ListarTicketsService](../README.md) / ListarTicketsService

# Class: ListarTicketsService

Defined in: application/tickets/ListarTicketsService.ts:9

Caso de uso: listar / tablero de tickets del back-office, respetando el alcance del rol.

## Constructors

### Constructor

> **new ListarTicketsService**(`queries`, `config`): `ListarTicketsService`

Defined in: application/tickets/ListarTicketsService.ts:10

#### Parameters

##### queries

[`ITicketQueries`](../../../../core/ports/repositories/ITicketQueries/interfaces/ITicketQueries.md)

##### config

[`IConfiguracionRepository`](../../../../core/ports/repositories/IConfiguracionRepository/interfaces/IConfiguracionRepository.md)

#### Returns

`ListarTicketsService`

## Methods

### listar()

> **listar**(`actor`, `filtro`): `Promise`\<\{ `tickets`: [`Ticket`](../../../../core/entities/Ticket/classes/Ticket.md)[]; `total`: `number`; `config`: [`ConfiguracionTickets`](../../../../core/entities/ConfiguracionTickets/interfaces/ConfiguracionTickets.md); \}\>

Defined in: application/tickets/ListarTicketsService.ts:21

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### filtro

[`FiltroTickets`](../../../../core/ports/repositories/ITicketQueries/interfaces/FiltroTickets.md)

#### Returns

`Promise`\<\{ `tickets`: [`Ticket`](../../../../core/entities/Ticket/classes/Ticket.md)[]; `total`: `number`; `config`: [`ConfiguracionTickets`](../../../../core/entities/ConfiguracionTickets/interfaces/ConfiguracionTickets.md); \}\>

***

### tablero()

> **tablero**(`actor`, `filtro`): `Promise`\<\{ `columnas`: [`ColumnaKanban`](../../../../core/ports/repositories/ITicketQueries/interfaces/ColumnaKanban.md)[]; `config`: [`ConfiguracionTickets`](../../../../core/entities/ConfiguracionTickets/interfaces/ConfiguracionTickets.md); \}\>

Defined in: application/tickets/ListarTicketsService.ts:34

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### filtro

[`FiltroTickets`](../../../../core/ports/repositories/ITicketQueries/interfaces/FiltroTickets.md)

#### Returns

`Promise`\<\{ `columnas`: [`ColumnaKanban`](../../../../core/ports/repositories/ITicketQueries/interfaces/ColumnaKanban.md)[]; `config`: [`ConfiguracionTickets`](../../../../core/entities/ConfiguracionTickets/interfaces/ConfiguracionTickets.md); \}\>
