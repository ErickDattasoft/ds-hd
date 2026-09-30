[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/tickets/ticketRepoConBitacora](../README.md) / ticketRepoConBitacora

# Function: ticketRepoConBitacora()

> **ticketRepoConBitacora**(`inner`, `bitacora`, `ids`): [`ITicketRepository`](../../../../core/ports/repositories/ITicketRepository/interfaces/ITicketRepository.md)

Envuelve el repositorio de tickets para que cada evento de su actividad (creación, estado,
notas, adjuntos, correos, facturación, papelera…) quede también en la Bitácora general, como
hacía el CRM viejo con `logBitacora("Ticket #…")`. Best-effort: si la bitácora falla, el
evento del ticket ya quedó guardado y no se interrumpe nada.

## Parameters

### inner

[`ITicketRepository`](../../../../core/ports/repositories/ITicketRepository/interfaces/ITicketRepository.md)

### bitacora

[`IBitacoraRepository`](../../../../core/ports/repositories/IBitacoraRepository/interfaces/IBitacoraRepository.md)

### ids

[`IIdGenerator`](../../../../core/ports/services/IIdGenerator/interfaces/IIdGenerator.md)

## Returns

[`ITicketRepository`](../../../../core/ports/repositories/ITicketRepository/interfaces/ITicketRepository.md)
