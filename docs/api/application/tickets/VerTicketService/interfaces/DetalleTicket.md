[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/tickets/VerTicketService](../README.md) / DetalleTicket

# Interface: DetalleTicket

Ticket con sus notas/eventos/adjuntos y los permisos del actor ya resueltos para la vista.

## Properties

### ticket

> **ticket**: [`Ticket`](../../../../core/entities/Ticket/classes/Ticket.md)

***

### notas

> **notas**: [`NotaTicket`](../../../../core/entities/NotaTicket/interfaces/NotaTicket.md)[]

***

### eventos

> **eventos**: [`EventoTicket`](../../../../core/entities/NotaTicket/interfaces/EventoTicket.md)[]

***

### adjuntos

> **adjuntos**: [`AdjuntoTicketMeta`](../../../../core/entities/AdjuntoTicket/type-aliases/AdjuntoTicketMeta.md)[]

***

### config

> **config**: [`ConfiguracionTickets`](../../../../core/entities/ConfiguracionTickets/interfaces/ConfiguracionTickets.md)

***

### puedeEditar

> **puedeEditar**: `boolean`

***

### puedeAsignar

> **puedeAsignar**: `boolean`

***

### puedeCambiarEstado

> **puedeCambiarEstado**: `boolean`
