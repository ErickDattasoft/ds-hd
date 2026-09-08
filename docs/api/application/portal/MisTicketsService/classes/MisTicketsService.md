[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/portal/MisTicketsService](../README.md) / MisTicketsService

# Class: MisTicketsService

Casos de uso de lectura del portal. Todas las consultas están acotadas a
`solicitanteUid === actor.uid`: un cliente jamás ve tickets de otro (ni de otro contacto
de su misma empresa).

## Constructors

### Constructor

> **new MisTicketsService**(`queries`, `tickets`, `config`, `adjuntos`): `MisTicketsService`

#### Parameters

##### queries

[`ITicketQueries`](../../../../core/ports/repositories/ITicketQueries/interfaces/ITicketQueries.md)

##### tickets

[`ITicketRepository`](../../../../core/ports/repositories/ITicketRepository/interfaces/ITicketRepository.md)

##### config

[`IConfiguracionRepository`](../../../../core/ports/repositories/IConfiguracionRepository/interfaces/IConfiguracionRepository.md)

##### adjuntos

[`IAdjuntoTicketRepository`](../../../../core/ports/repositories/IAdjuntoTicketRepository/interfaces/IAdjuntoTicketRepository.md)

#### Returns

`MisTicketsService`

## Methods

### listar()

> **listar**(`actor`, `incluirCerrados`): `Promise`\<[`Ticket`](../../../../core/entities/Ticket/classes/Ticket.md)[]\>

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### incluirCerrados

`boolean`

#### Returns

`Promise`\<[`Ticket`](../../../../core/entities/Ticket/classes/Ticket.md)[]\>

***

### catalogoParaCrear()

> **catalogoParaCrear**(): `Promise`\<[`ConfiguracionTickets`](../../../../core/entities/ConfiguracionTickets/interfaces/ConfiguracionTickets.md)\>

#### Returns

`Promise`\<[`ConfiguracionTickets`](../../../../core/entities/ConfiguracionTickets/interfaces/ConfiguracionTickets.md)\>

***

### verDetalle()

> **verDetalle**(`actor`, `ticketId`): `Promise`\<[`MiTicketDetalle`](../interfaces/MiTicketDetalle.md)\>

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### ticketId

`string`

#### Returns

`Promise`\<[`MiTicketDetalle`](../interfaces/MiTicketDetalle.md)\>
