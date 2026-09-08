[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/tickets/VerTicketService](../README.md) / VerTicketService

# Class: VerTicketService

Caso de uso: cargar el detalle de un ticket para el back-office (notas internas filtradas).

## Constructors

### Constructor

> **new VerTicketService**(`tickets`, `config`, `adjuntos`): `VerTicketService`

#### Parameters

##### tickets

[`ITicketRepository`](../../../../core/ports/repositories/ITicketRepository/interfaces/ITicketRepository.md)

##### config

[`IConfiguracionRepository`](../../../../core/ports/repositories/IConfiguracionRepository/interfaces/IConfiguracionRepository.md)

##### adjuntos

[`IAdjuntoTicketRepository`](../../../../core/ports/repositories/IAdjuntoTicketRepository/interfaces/IAdjuntoTicketRepository.md)

#### Returns

`VerTicketService`

## Methods

### ejecutar()

> **ejecutar**(`actor`, `ticketId`): `Promise`\<[`DetalleTicket`](../interfaces/DetalleTicket.md)\>

#### Parameters

##### actor

[`SessionUser`](../../../shared/SessionUser/interfaces/SessionUser.md)

##### ticketId

`string`

#### Returns

`Promise`\<[`DetalleTicket`](../interfaces/DetalleTicket.md)\>
