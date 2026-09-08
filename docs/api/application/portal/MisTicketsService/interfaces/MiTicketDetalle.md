[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/portal/MisTicketsService](../README.md) / MiTicketDetalle

# Interface: MiTicketDetalle

Detalle de ticket ya filtrado para el portal: sin notas ni eventos internos.

## Properties

### ticket

> **ticket**: [`Ticket`](../../../../core/entities/Ticket/classes/Ticket.md)

***

### notas

> **notas**: [`NotaTicket`](../../../../core/entities/NotaTicket/interfaces/NotaTicket.md)[]

SOLO notas públicas — el portal nunca muestra notas internas.

***

### eventos

> **eventos**: [`EventoTicket`](../../../../core/entities/NotaTicket/interfaces/EventoTicket.md)[]

Eventos "seguros" para el cliente (cambios de estado y respuestas).

***

### adjuntos

> **adjuntos**: [`AdjuntoTicketMeta`](../../../../core/entities/AdjuntoTicket/type-aliases/AdjuntoTicketMeta.md)[]

Adjuntos del ticket (metadatos, sin el contenido).
