[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/portal/MisTicketsService](../README.md) / MiTicketDetalle

# Interface: MiTicketDetalle

Defined in: application/portal/MisTicketsService.ts:11

Detalle de ticket ya filtrado para el portal: sin notas ni eventos internos.

## Properties

### ticket

> **ticket**: [`Ticket`](../../../../core/entities/Ticket/classes/Ticket.md)

Defined in: application/portal/MisTicketsService.ts:12

***

### notas

> **notas**: [`NotaTicket`](../../../../core/entities/NotaTicket/interfaces/NotaTicket.md)[]

Defined in: application/portal/MisTicketsService.ts:14

SOLO notas públicas — el portal nunca muestra notas internas.

***

### eventos

> **eventos**: [`EventoTicket`](../../../../core/entities/NotaTicket/interfaces/EventoTicket.md)[]

Defined in: application/portal/MisTicketsService.ts:16

Eventos "seguros" para el cliente (cambios de estado y respuestas).
