[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/tickets/ListarTicketsService](../README.md) / ListarTicketsService

# Class: ListarTicketsService

Caso de uso: listar / tablero de tickets del back-office, respetando el alcance del rol.

## Constructors

### Constructor

> **new ListarTicketsService**(`queries`, `config`): `ListarTicketsService`

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

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### filtro

[`FiltroTickets`](../../../../core/ports/repositories/ITicketQueries/interfaces/FiltroTickets.md)

#### Returns

`Promise`\<\{ `tickets`: [`Ticket`](../../../../core/entities/Ticket/classes/Ticket.md)[]; `total`: `number`; `config`: [`ConfiguracionTickets`](../../../../core/entities/ConfiguracionTickets/interfaces/ConfiguracionTickets.md); \}\>

***

### equipoRecordatorio()

> **equipoRecordatorio**(): `Promise`\<`string`[]\>

Nombres del equipo que puede recibir el recordatorio por WhatsApp de un ticket programado.

#### Returns

`Promise`\<`string`[]\>

***

### contarEnPapelera()

> **contarEnPapelera**(`actor`): `Promise`\<`number`\>

Cuántos tickets hay en la papelera (contador del botón 🗑️ del listado).

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

#### Returns

`Promise`\<`number`\>

***

### resumenPorEstado()

> **resumenPorEstado**(`actor`): `Promise`\<\{ `total`: `number`; `porEstado`: `Record`\<`string`, `number`\>; \}\>

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

#### Returns

`Promise`\<\{ `total`: `number`; `porEstado`: `Record`\<`string`, `number`\>; \}\>

***

### tablero()

> **tablero**(`actor`, `filtro`): `Promise`\<\{ `columnas`: [`ColumnaKanban`](../../../../core/ports/repositories/ITicketQueries/interfaces/ColumnaKanban.md)[]; `config`: [`ConfiguracionTickets`](../../../../core/entities/ConfiguracionTickets/interfaces/ConfiguracionTickets.md); \}\>

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### filtro

[`FiltroTickets`](../../../../core/ports/repositories/ITicketQueries/interfaces/FiltroTickets.md)

#### Returns

`Promise`\<\{ `columnas`: [`ColumnaKanban`](../../../../core/ports/repositories/ITicketQueries/interfaces/ColumnaKanban.md)[]; `config`: [`ConfiguracionTickets`](../../../../core/entities/ConfiguracionTickets/interfaces/ConfiguracionTickets.md); \}\>
