[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/dashboard/AgendaService](../README.md) / AgendaService

# Class: AgendaService

Calendario mensual con tickets programados (agenda), eventos y tareas con fecha límite —
acotado al alcance del actor (sus tickets si no puede ver todos; sus tareas siempre).

## Constructors

### Constructor

> **new AgendaService**(`ticketQueries`, `eventos`, `tareas`, `clock`): `AgendaService`

#### Parameters

##### ticketQueries

[`ITicketQueries`](../../../../core/ports/repositories/ITicketQueries/interfaces/ITicketQueries.md)

##### eventos

[`IEventoRepository`](../../../../core/ports/repositories/IEventoRepository/interfaces/IEventoRepository.md)

##### tareas

[`ITareaRepository`](../../../../core/ports/repositories/ISeguimientoRepository/interfaces/ITareaRepository.md)

##### clock

[`IClock`](../../../../core/ports/services/IClock/interfaces/IClock.md)

#### Returns

`AgendaService`

## Methods

### mes()

> **mes**(`actor`, `anio`, `mes`): `Promise`\<[`CalendarioMes`](../interfaces/CalendarioMes.md)\>

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### anio

`number`

##### mes

`number`

#### Returns

`Promise`\<[`CalendarioMes`](../interfaces/CalendarioMes.md)\>
