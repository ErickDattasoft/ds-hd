[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/portal/CrearTicketPortalService](../README.md) / CrearTicketPortalService

# Class: CrearTicketPortalService

Caso de uso: un cliente del portal crea un ticket. Reutiliza [CrearTicketService](../../../tickets/CrearTicketService/classes/CrearTicketService.md)
fijando `canal='portal'`, `solicitanteUid` y la empresa del cliente — el cliente no puede
elegir a nombre de quién ni para qué empresa.

## Constructors

### Constructor

> **new CrearTicketPortalService**(`crearTicket`): `CrearTicketPortalService`

#### Parameters

##### crearTicket

[`CrearTicketService`](../../../tickets/CrearTicketService/classes/CrearTicketService.md)

#### Returns

`CrearTicketPortalService`

## Methods

### ejecutar()

> **ejecutar**(`input`): `Promise`\<[`Ticket`](../../../../core/entities/Ticket/classes/Ticket.md)\>

#### Parameters

##### input

[`CrearTicketPortalInput`](../interfaces/CrearTicketPortalInput.md)

#### Returns

`Promise`\<[`Ticket`](../../../../core/entities/Ticket/classes/Ticket.md)\>
