[**ds-hd**](../../../../README.md)

***

[ds-hd](../../../../README.md) / [application/tickets/desinflarImagenesDescripcion](../README.md) / desinflarImagenesDescripcion

# Function: desinflarImagenesDescripcion()

> **desinflarImagenesDescripcion**(`html`, `ticketId`, `actor`, `adjuntos`, `ids`, `ahora`): `Promise`\<`string`\>

"Desinfla" las imágenes pegadas/insertadas en la descripción de un ticket (llegan como
`<img src="data:image/...;base64,...">` desde el editor, ver `data-editor-html` en `app.js`):
cada una se sube como un `AdjuntoTicket` normal y se reemplaza por una referencia liviana
`<img data-adj-id="…">` — lo único que se guarda en el documento del ticket. Nunca se persiste
el `data:` URI ahí (documento de Firestore limitado a 1 MiB; ver el mismo incidente que ya tuvo
el CRM viejo con adjuntos embebidos, documentado en su propio código).

Debe correr ANTES de `Ticket.crear`/`new Ticket(...)`, que sanea la descripción y por diseño
SIEMPRE quita cualquier `src` de una `<img>` (nunca confía en un `src` que venga del cliente) —
así que si una imagen no se desinfla aquí primero, simplemente desaparece más adelante.

## Parameters

### html

`string`

### ticketId

`string`

### actor

#### uid

`string`

#### nombre

`string`

### adjuntos

[`IAdjuntoTicketRepository`](../../../../core/ports/repositories/IAdjuntoTicketRepository/interfaces/IAdjuntoTicketRepository.md)

### ids

[`IIdGenerator`](../../../../core/ports/services/IIdGenerator/interfaces/IIdGenerator.md)

### ahora

`Date`

## Returns

`Promise`\<`string`\>
